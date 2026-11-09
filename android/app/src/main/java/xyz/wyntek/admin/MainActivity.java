package xyz.wyntek.admin;

import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.activity.BackEventCompat;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {

    private OnBackPressedCallback back;
    private int backEdge = BackEventCompat.EDGE_LEFT;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Must be registered before super.onCreate builds the bridge.
        registerPlugin(AdminBridge.class);
        super.onCreate(savedInstanceState);
        // The admin lives under /admin. Any other page of the same site (View live site,
        // View on site) opens in the phone's in-app browser, which has an X to close it,
        // instead of replacing the admin full screen.
        bridge.setWebViewClient(new SiteAwareClient(bridge));
        setUpBack();
        // A fresh start: covered until the page has shown its lock screen. The page
        // asks AppLock whether a lock is pending before it shows anything.
        if (AppLock.decide(this)) {
            showCover();
            watch(20000, false);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        updateBack();
    }

    // ---------- App lock ----------
    // Leaving: note the time and cover the window at once (Android always runs
    // this, even when the page is paused). Coming back: decide here, keep the
    // cover up and ask the page for its lock screen; the cover comes off when
    // the page confirms (lockShown). If it never confirms, the page is loaded
    // again, and a fresh page always checks the lock first.

    @Override
    public void onStop() {
        if (AppLock.left(this)) showCover();
        super.onStop();
    }

    @Override
    public void onRestart() {
        super.onRestart();
        if (AppLock.decide(this)) {
            showCover();
            AdminBridge plugin = adminBridge();
            if (plugin != null) plugin.askForLock();
            watch(6000, true);
        } else {
            hideCover();
        }
    }

    private View cover;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable watchdog;

    private void showCover() {
        if (cover == null) {
            FrameLayout c = new FrameLayout(this);
            c.setClickable(true); // nothing behind it can be touched
            c.setFocusable(true);
            ImageView icon = new ImageView(this);
            icon.setImageResource(R.mipmap.ic_launcher_round);
            int size = Math.round(72 * getResources().getDisplayMetrics().density);
            c.addView(icon, new FrameLayout.LayoutParams(size, size, Gravity.CENTER));
            addContentView(c, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            cover = c;
        }
        try {
            cover.setBackgroundColor(Color.parseColor(AppLock.background(this)));
        } catch (IllegalArgumentException e) {
            cover.setBackgroundColor(Color.parseColor("#0b1020"));
        }
        cover.setVisibility(View.VISIBLE);
        cover.bringToFront();
    }

    private void hideCover() {
        if (watchdog != null) handler.removeCallbacks(watchdog);
        watchdog = null;
        if (cover != null) cover.setVisibility(View.GONE);
    }

    /** The page's lock screen is up (or nothing needed locking): the cover can go. */
    void lockShown() {
        AppLock.setPending(this, false);
        hideCover();
    }

    // If the page has not confirmed in time: reload it once (it then locks by
    // itself on start); after that, or on a fresh start, uncover once the new
    // page has had its chance (it reads the pending lock before showing anything).
    private void watch(long ms, boolean reloadFirst) {
        if (watchdog != null) handler.removeCallbacks(watchdog);
        watchdog = () -> {
            if (cover == null || cover.getVisibility() != View.VISIBLE) return;
            if (reloadFirst && AppLock.pending(this)) {
                bridge.getWebView().reload();
                watch(15000, false);
            } else {
                hideCover();
            }
        };
        handler.postDelayed(watchdog, ms);
    }

    private AdminBridge adminBridge() {
        PluginHandle h = bridge == null ? null : bridge.getPlugin("AdminBridge");
        return h == null ? null : (AdminBridge) h.getInstance();
    }

    // ---------- Back (predictive back on Android 13 and newer) ----------
    // While the admin has somewhere to go back to (another section, an open post,
    // the More sheet, the photo editor), Back is handled here: the screen shrinks
    // a little and follows the swipe, and letting go goes back one step. On the
    // first screen this hands Back to Android, which shows its own preview of
    // going to the home screen and puts the app in the background.
    // The App plugin's own Back handling is switched off in capacitor.config.json.
    private void setUpBack() {
        back = new OnBackPressedCallback(false) {
            @Override
            public void handleOnBackStarted(@NonNull BackEventCompat e) {
                backEdge = e.getSwipeEdge();
            }

            @Override
            public void handleOnBackProgressed(@NonNull BackEventCompat e) {
                WebView v = bridge.getWebView();
                float p = e.getProgress();
                float scale = 1f - 0.08f * p;
                v.setPivotX(backEdge == BackEventCompat.EDGE_LEFT ? v.getWidth() : 0);
                v.setPivotY(v.getHeight() / 2f);
                v.setScaleX(scale);
                v.setScaleY(scale);
                v.setTranslationX((backEdge == BackEventCompat.EDGE_LEFT ? 1 : -1) * p * v.getWidth() * 0.05f);
            }

            @Override
            public void handleOnBackCancelled() {
                resetPreview(true);
            }

            @Override
            public void handleOnBackPressed() {
                resetPreview(false);
                WebView v = bridge.getWebView();
                if (v.canGoBack()) v.goBack();
                v.postDelayed(MainActivity.this::updateBack, 150);
            }
        };
        getOnBackPressedDispatcher().addCallback(this, back);
        updateBack();
    }

    private void resetPreview(boolean animate) {
        WebView v = bridge.getWebView();
        if (animate) {
            v.animate().scaleX(1f).scaleY(1f).translationX(0f).setDuration(180).start();
        } else {
            v.animate().cancel();
            v.setScaleX(1f);
            v.setScaleY(1f);
            v.setTranslationX(0f);
        }
    }

    void updateBack() {
        if (back == null || bridge == null || bridge.getWebView() == null) return;
        back.setEnabled(bridge.getWebView().canGoBack());
    }

    private class SiteAwareClient extends BridgeWebViewClient {

        SiteAwareClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (request.isForMainFrame() && isPublicSitePage(url)) {
                // Looking at your own site must not lock the admin when you come back.
                view.evaluateJavascript("window.__adminQuietFor && window.__adminQuietFor(300000)", null);
                AppLock.quiet(MainActivity.this, 300000);
                new CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(MainActivity.this, url);
                return true;
            }
            return super.shouldOverrideUrlLoading(view, request);
        }

        // Every section change, open post or sheet adds a step to the history:
        // Back follows it.
        @Override
        public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
            super.doUpdateVisitedHistory(view, url, isReload);
            updateBack();
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            updateBack();
            // The offline page (no connection at start) shows nothing private and
            // cannot answer the lock, so it is never kept covered.
            if (url != null && !url.startsWith("https://")) hideCover();
        }
    }

    private boolean isPublicSitePage(Uri url) {
        String server = bridge.getServerUrl();
        if (server == null || url == null) return false;
        Uri base = Uri.parse(server);
        if (base.getHost() == null || !base.getHost().equalsIgnoreCase(url.getHost())) return false;
        if (!"https".equalsIgnoreCase(url.getScheme())) return false;
        String path = url.getPath() == null ? "" : url.getPath();
        return !(path.equals("/admin") || path.startsWith("/admin/"));
    }
}
