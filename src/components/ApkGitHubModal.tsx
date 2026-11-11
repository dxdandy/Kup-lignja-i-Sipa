import React, { useState } from 'react';
import { Member } from '../types';
import {
  X,
  Copy,
  Check,
  Smartphone,
  Github,
  Sparkles,
  Lock,
  RefreshCw,
  Radio,
  CheckCircle,
  AlertCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { OTAVersionInfo } from '../hooks/useOTAUpdate';

interface ApkGitHubModalProps {
  isOpen: boolean;
  currentUser?: Member | null;
  remoteInfo: OTAVersionInfo | null;
  currentVersion: string;
  isChecking: boolean;
  onCheckForUpdates: () => Promise<boolean>;
  onApplyUpdate: () => void;
  onClose: () => void;
}

export const ApkGitHubModal: React.FC<ApkGitHubModalProps> = ({
  isOpen,
  currentUser,
  remoteInfo,
  currentVersion,
  isChecking,
  onCheckForUpdates,
  onApplyUpdate,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ota' | 'apk'>('ota');
  const [versionNumber, setVersionNumber] = useState<string>('1.0');
  const [appName, setAppName] = useState<string>('Lignjolov_NoviVinodolski');
  const [copiedWorkflow, setCopiedWorkflow] = useState<boolean>(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [lastCheckResult, setLastCheckResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const generatedApkFileName = `${appName}_v${versionNumber}.apk`;

  const handleManualCheck = async () => {
    setLastCheckResult(null);
    const hasNewer = await onCheckForUpdates();
    if (hasNewer) {
      setLastCheckResult('Pronađena je novija verzija! Možete je odmah primijeniti.');
    } else {
      setLastCheckResult('Vaša aplikacija je ažurirana na najnoviju verziju (v' + (remoteInfo?.version || currentVersion) + ').');
    }
  };

  const handleSendOTABroadcast = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setIsBroadcasting(true);
    setBroadcastStatus(null);
    try {
      const res = await fetch('/api/ota-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: currentUser.id,
          newVersion: remoteInfo?.version || currentVersion,
          releaseNotes: 'Kapetan Daniel je poslao Live OTA ažuriranje sa sinkroniziranim podacima!',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastStatus('✅ OTA obavijest je trenutno poslana svim povezanim članovima!');
      } else {
        setBroadcastStatus('❌ Greška: ' + (data.error || 'Neuspjelo slanje.'));
      }
    } catch {
      setBroadcastStatus('❌ Greška u povezivanju s poslužiteljem.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const githubActionsWorkflowCode = `name: Build & Release Versioned Android APK

on:
  push:
    tags:
      - 'v*'
    branches:
      - main
  workflow_dispatch:
    inputs:
      version:
        description: 'Verzija aplikacije (npr. 1.0 ili 1.1)'
        required: false
        default: '${versionNumber}'

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout koda
        uses: actions/checkout@v4

      - name: Postavi Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Instaliraj ovisnosti i izgradi Web App
        run: |
          npm ci
          npm run build

      - name: Izvuci verziju iz package.json ili taga
        id: get_version
        run: |
          if [ -n "\${{ github.event.inputs.version }}" ]; then
            APP_VER="\${{ github.event.inputs.version }}"
          elif [[ "\${{ github.ref }}" == refs/tags/* ]]; then
            APP_VER="\${GITHUB_REF#refs/tags/v}"
          else
            APP_VER=$(node -p "require('./package.json').version || '1.0'")
          fi
          echo "APP_VERSION=$APP_VER" >> $GITHUB_ENV
          echo "Verzija APK-a: $APP_VER"

      - name: Postavi Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Inicijaliziraj Capacitor i postavi ikonu aplikacije
        run: |
          npm install @capacitor/core @capacitor/android @capacitor/cli
          npx cap add android
          # Kopiraj prilagođenu ikonu lignje s bijelom podlogom
          mkdir -p android/app/src/main/res/mipmap-xxxhdpi
          mkdir -p android/app/src/main/res/mipmap-xxhdpi
          mkdir -p android/app/src/main/res/mipmap-xhdpi
          mkdir -p android/app/src/main/res/mipmap-hdpi
          mkdir -p android/app/src/main/res/mipmap-mdpi
          cp public/icon.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
          cp public/icon.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
          cp public/icon.png android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
          cp public/icon.png android/app/src/main/res/mipmap-hdpi/ic_launcher.png
          cp public/icon.png android/app/src/main/res/mipmap-mdpi/ic_launcher.png
          # Zaključaj vertikalni (portrait) položaj u AndroidManifest.xml
          sed -i 's/<activity /<activity android:screenOrientation="portrait" /g' android/app/src/main/AndroidManifest.xml
          npx cap sync android

      - name: Izgradi Android APK
        working-directory: android
        run: ./gradlew assembleRelease

      - name: Imenuj APK s verzijom (${appName}_v\${{ env.APP_VERSION }}.apk)
        run: |
          mkdir -p release-apks
          ORIGINAL_APK="android/app/build/outputs/apk/release/app-release-unsigned.apk"
          VERSIONED_APK="release-apks/${appName}_v\${{ env.APP_VERSION }}.apk"
          cp $ORIGINAL_APK $VERSIONED_APK
          echo "Konačni APK stvoren: $VERSIONED_APK"

      - name: Prenesi gotov APK u GitHub Artefakte
        uses: actions/upload-artifact@v4
        with:
          name: ${appName}_v\${{ env.APP_VERSION }}-apk
          path: release-apks/*.apk

      - name: Stvori GitHub Release s verzijom
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v2
        with:
          files: release-apks/*.apk
          name: "Lignjolov Kup v\${{ env.APP_VERSION }}"
          draft: false
          prerelease: false
`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWorkflow(true);
    setTimeout(() => setCopiedWorkflow(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-cyan-800/60 shadow-2xl p-4 sm:p-6 space-y-4 my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 border-2 border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0 overflow-hidden">
              <img
                src="/icon.png"
                alt="Ikona Lignje"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Live OTA Ažuriranja & APK Verzije
              </h3>
              <p className="text-xs text-slate-400">
                Automatska sinkronizacija koda preko zraka (OTA) + verzijski GitHub APK
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tab Navigation: Live OTA vs GitHub APK */}
        <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('ota')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeSubTab === 'ota'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Live OTA Ažuriranja (Bez reinstalacije)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('apk')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeSubTab === 'apk'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub APK Graditelj (v1.0.apk)</span>
          </button>
        </div>

        {/* Tab 1: Live OTA Updates */}
        {activeSubTab === 'ota' && (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono">
                    Live OTA Sustav Aktivan
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-white font-mono">
                    Instalirana verzija: v{currentVersion}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    (Poslužitelj: v{remoteInfo?.version || currentVersion})
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Kanal: <span className="text-cyan-300 font-mono">production-live</span> • Lokacija: Novi Vinodolski
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={handleManualCheck}
                  disabled={isChecking}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isChecking ? 'Provjeravam...' : 'Provjeri Ažuriranja'}</span>
                </button>

                <button
                  onClick={onApplyUpdate}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/25 transition-transform active:scale-95"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  <span>Osvježi Uživo (OTA)</span>
                </button>
              </div>
            </div>

            {/* Check Result Feedback */}
            {lastCheckResult && (
              <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-800 text-xs text-cyan-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lastCheckResult}</span>
              </div>
            )}

            {/* Admin Broadcast Card */}
            {currentUser?.role === 'admin' && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-950 border border-indigo-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Kapetanske OTA Ovlasti (Admin: Daniel)</span>
                  </span>
                  <span className="text-[10px] bg-indigo-900/80 text-indigo-200 px-2 py-0.5 rounded font-mono">
                    SSE Broadcast
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ako napraviš izmjenu u rezultatima ili aplikaciji, klikom na gumb ispod možeš trenutno poslati OTA signal na mobitele Tune, Silvija i Dide kako bi njihove aplikacije odmah prikazale obavijest o ažuriranju!
                </p>

                <button
                  onClick={handleSendOTABroadcast}
                  disabled={isBroadcasting}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/30 w-full sm:w-auto"
                >
                  <Radio className={`w-3.5 h-3.5 ${isBroadcasting ? 'animate-ping' : ''}`} />
                  <span>{isBroadcasting ? 'Slanje signala...' : '📡 Pošalji OTA Obavijest Svim Članovima'}</span>
                </button>

                {broadcastStatus && (
                  <p className="text-xs text-emerald-300 pt-1 font-semibold">{broadcastStatus}</p>
                )}
              </div>
            )}

            {/* How OTA Works Explanation */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Kako funkcionira Live OTA ažuriranje (kao u RiboPrognozi):
              </h4>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-white">Nema ponovne instalacije APK-a:</strong> Članovi tima ne moraju preuzimati i ručno instalirati novu APK datoteku za svaku sitnu izmjenu.
                </li>
                <li>
                  <strong className="text-white">Automatska provjera u pozadini:</strong> Svaki put kada se aplikacija otvori na mobitelu ili kad se vrati iz pozadine (focus/visibilitychange), aplikacija provjerava poslužitelj.
                </li>
                <li>
                  <strong className="text-white">Čišćenje cachea:</strong> Pritiskom na "Ažuriraj uživo" automatski se briše predmemorija (cache) i ponovno učitava najnoviji kod u sekundi.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: GitHub APK Builder */}
        {activeSubTab === 'apk' && (
          <div className="space-y-4">
            {/* Visual Showcase: App Icon & Responsive Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-900/60 flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white p-0.5 border-2 border-cyan-400 shadow-md shrink-0 overflow-hidden">
                  <img
                    src="/icon.png"
                    alt="Instalacijska Ikona"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                    Službena APK Ikona
                  </span>
                  <h4 className="text-xs font-bold text-white">Crveno-pink lignja (bijela podloga)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Velike oči i krakovi, fiksirana za ikonu na ekranu mobitela.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Vertikalni Prikaz Zaključan</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Automatska prilagodba bilo kojoj rezoluciji ekrana (100dvh fluid).
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic APK Name Form */}
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-900/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Naziv APK aplikacije:
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value.replace(/\s+/g, '_'))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Verzija APK-a:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={versionNumber}
                      onChange={(e) => setVersionNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setVersionNumber('1.0')}
                      className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded font-mono"
                    >
                      v1.0
                    </button>
                    <button
                      type="button"
                      onClick={() => setVersionNumber('1.1')}
                      className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded font-mono"
                    >
                      v1.1
                    </button>
                  </div>
                </div>
              </div>

              {/* Output Preview */}
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 block">Generirani APK s verzijom:</span>
                  <span className="text-sm font-black font-mono text-cyan-300">
                    📦 {generatedApkFileName}
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-mono">✅ Spremno za GitHub Actions</span>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-white" />
                  <span>GitHub Actions Skripta (.github/workflows/build-apk.yml)</span>
                </span>
                <button
                  onClick={() => copyToClipboard(githubActionsWorkflowCode)}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 bg-slate-800 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {copiedWorkflow ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Kopirano!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopiraj kod</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="max-h-40 overflow-y-auto p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-300/90 font-mono leading-relaxed">
                {githubActionsWorkflowCode}
              </pre>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
};
