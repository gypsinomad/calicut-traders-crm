import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Smartphone, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Shield, Wifi, Star } from 'lucide-react';

interface Release {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

// ---- CONFIGURE THESE TWO VALUES ----
const GITHUB_OWNER = (import.meta as any).env.VITE_GITHUB_OWNER || 'your-github-username';
const GITHUB_REPO  = (import.meta as any).env.VITE_GITHUB_REPO  || 'calicut-traders-crm';
// ------------------------------------

const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

export default function DownloadApp() {
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [copied, setCopied]  = useState(false);

  const isAndroid = /android/i.test(navigator.userAgent);

  useEffect(() => {
    fetch(RELEASES_API)
      .then(r => {
        if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
        return r.json();
      })
      .then((data: Release) => { setRelease(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const apkAsset = release?.assets.find(a => a.name.endsWith('.apk'));
  const downloadUrl = apkAsset?.browser_download_url ?? '';
  const pageUrl = window.location.href;

  const copyLink = () => {
    navigator.clipboard.writeText(downloadUrl || pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-2">
            <Smartphone className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold">Calicut Traders CRM</h1>
          <p className="text-gray-400">Android App — always the latest release</p>
        </div>

        {/* Release Card */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 space-y-4">
          {loading && (
            <div className="flex items-center gap-3 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Fetching latest release…</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 text-amber-400 bg-amber-400/10 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Could not load release info</p>
                <p className="text-sm text-amber-300/70 mt-1">{error}</p>
                <p className="text-sm text-amber-300/70 mt-1">
                  Make sure <code className="bg-amber-400/10 px-1 rounded">VITE_GITHUB_OWNER</code> and{' '}
                  <code className="bg-amber-400/10 px-1 rounded">VITE_GITHUB_REPO</code> are set.
                </p>
              </div>
            </div>
          )}

          {release && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono border border-emerald-500/30">
                    {release.tag_name}
                  </span>
                  <span className="text-gray-500 text-sm">{timeAgo(release.published_at)}</span>
                </div>
                {apkAsset && (
                  <span className="text-gray-500 text-sm">{formatBytes(apkAsset.size)}</span>
                )}
              </div>

              <h2 className="text-lg font-semibold">{release.name}</h2>

              {/* Primary Download Button */}
              {apkAsset ? (
                <a
                  href={downloadUrl}
                  download
                  className="flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all font-semibold text-gray-950 text-lg shadow-lg shadow-emerald-500/20"
                >
                  <Download className="w-5 h-5" />
                  {isAndroid ? 'Download & Install APK' : 'Download APK'}
                </a>
              ) : (
                <div className="flex items-center gap-3 text-gray-500 bg-gray-800 rounded-xl p-4">
                  <AlertCircle className="w-5 h-5" />
                  <span>No APK found in this release</span>
                </div>
              )}

              {/* File name */}
              {apkAsset && (
                <p className="text-center text-xs text-gray-600">{apkAsset.name}</p>
              )}
            </>
          )}
        </div>

        {/* QR Code Section */}
        {(downloadUrl || !loading) && (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Scan to download on your phone
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white p-3 rounded-2xl shadow-lg">
                <QRCodeSVG
                  value={downloadUrl || pageUrl}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#0a0a0a"
                  level="H"
                />
              </div>
              <div className="space-y-3 flex-1 text-sm text-gray-400">
                <p className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">1.</span>
                  Open your camera app on any Android phone
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">2.</span>
                  Point it at the QR code — tap the link that appears
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">3.</span>
                  Tap <strong className="text-white">Download</strong> then open the file to install
                </p>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 text-xs bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors mt-2"
                >
                  {copied
                    ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
                    : <><ExternalLink className="w-3.5 h-3.5" /> Copy download link</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Installation Guide */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            Installation guide
          </h3>
          <ol className="space-y-3 text-sm text-gray-400">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold border border-blue-500/30">1</span>
              <span>Download the APK using the button above or by scanning the QR code.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold border border-blue-500/30">2</span>
              <span>On Android, go to <strong className="text-white">Settings → Apps → Special app access → Install unknown apps</strong> and allow your browser.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold border border-blue-500/30">3</span>
              <span>Open the downloaded APK from your notification shade or Downloads folder and tap <strong className="text-white">Install</strong>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold border border-blue-500/30">4</span>
              <span>Open the app and sign in with your Calicut Traders CRM credentials.</span>
            </li>
          </ol>
        </div>

        {/* Auto-update note */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 flex items-start gap-3">
          <Star className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="font-semibold text-white mb-1">Always up to date</p>
            <p>A new APK is automatically built and published here every time code is pushed to the main branch. Check back here for updates.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-700 pb-6">
          <Wifi className="w-4 h-4 inline mr-1" />
          Requires an internet connection to sync data
        </div>

      </div>
    </div>
  );
}