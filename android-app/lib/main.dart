// TypeScape — Android shell.
//
// This is deliberately *not* a reimplementation of the site. It is a WebView
// pointed at the live app, so there is one codebase for the product and the
// shell only adds what a browser cannot give on Android: a launcher entry, a
// working back gesture, and an offline message that names the real cause.
//
// The base URL is the Tailscale address, so the app works anywhere on the
// tailnet without exposing the site publicly. If the site moves to a public
// domain, change `_baseUrl` and rebuild.

import "dart:io";

import "package:flutter/material.dart";
import "package:webview_flutter/webview_flutter.dart";
import "package:webview_flutter_android/webview_flutter_android.dart";
import "package:url_launcher/url_launcher.dart";

/// The origin the shell loads. No trailing slash: paths are joined to it.
const String _baseUrl = "https://episteme-1.tail19de5f.ts.net:8444";

/// Hosts that stay inside the WebView. Anything else opens in the real browser,
/// so an external link cannot trap the reader in a chrome-less window.
const List<String> _internalHosts = ["episteme-1.tail19de5f.ts.net"];

void main() => runApp(const TypeScapeApp());

class TypeScapeApp extends StatelessWidget {
  const TypeScapeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "TypeScape",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        // Matches the site's ink so there is no white flash before first paint.
        scaffoldBackgroundColor: const Color(0xFF01050B),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF158FD4),
          brightness: Brightness.dark,
        ),
      ),
      home: const ShellPage(),
    );
  }
}

class ShellPage extends StatefulWidget {
  const ShellPage({super.key});

  @override
  State<ShellPage> createState() => _ShellPageState();
}

class _ShellPageState extends State<ShellPage> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _offline = false;

  @override
  void initState() {
    super.initState();

    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF01050B))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (_) => setState(() {
            _loading = false;
            _offline = false;
          }),
          onWebResourceError: (error) {
            // Only a main-frame failure makes the app unusable; a missing image
            // or a blocked third-party frame must not blank the screen.
            if (error.isForMainFrame ?? false) {
              setState(() {
                _loading = false;
                _offline = true;
              });
            }
          },
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null) return NavigationDecision.prevent;
            if (_internalHosts.contains(uri.host) || uri.scheme == "about") {
              return NavigationDecision.navigate;
            }
            launchUrl(uri, mode: LaunchMode.externalApplication);
            return NavigationDecision.prevent;
          },
        ),
      );

    if (Platform.isAndroid) {
      final android = controller.platform as AndroidWebViewController;
      android.setMediaPlaybackRequiresUserGesture(false);
    }

    _controller = controller;
    _controller.loadRequest(Uri.parse("$_baseUrl/"));
  }

  /// The Android back gesture should walk WebView history before exiting.
  Future<bool> _handleBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldExit = await _handleBack();
        if (shouldExit && mounted) {
          // ignore: use_build_context_synchronously
          Navigator.of(context).maybePop();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_loading)
                const Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(
                    minHeight: 2,
                    backgroundColor: Color(0xFF0E4A80),
                    color: Color(0xFF158FD4),
                  ),
                ),
              if (_offline) _OfflineView(onRetry: () => _controller.reload()),
            ],
          ),
        ),
      ),
    );
  }
}

/// Shown when the main frame fails. The usual cause is the phone being off the
/// tailnet, so say that rather than blaming the app.
class _OfflineView extends StatelessWidget {
  const _OfflineView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF01050B),
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            "TYPESCAPE",
            style: TextStyle(
              fontSize: 26,
              letterSpacing: 4,
              fontWeight: FontWeight.w800,
              color: Color(0xFF158FD4),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            "Can't reach the server.",
            style: TextStyle(fontSize: 16, color: Color(0xFFFFFFFF)),
          ),
          const SizedBox(height: 8),
          const Text(
            "Check that Tailscale is connected on this device, then try again.",
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF9DAECC)),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: onRetry,
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF158FD4)),
            child: const Text("Retry"),
          ),
        ],
      ),
    );
  }
}
