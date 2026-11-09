package xyz.wyntek.admin;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.activity.BackEventCompat;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

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
    }

    @Override
    public void onResume() {
        super.onResume();
        updateBack();
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
