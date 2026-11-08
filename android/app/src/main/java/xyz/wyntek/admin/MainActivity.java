package xyz.wyntek.admin;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The admin lives under /admin. Any other page of the same site (View live site,
        // View on site) opens in the phone's in-app browser, which has an X to close it,
        // instead of replacing the admin full screen.
        bridge.setWebViewClient(new SiteAwareClient(bridge));
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
