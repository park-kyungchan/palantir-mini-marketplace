---
sourceUrl: "https://www.palantir.com/docs/foundry/custom-widgets/dark-theme/"
canonicalUrl: "https://palantir.com/docs/foundry/custom-widgets/dark-theme/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9ed2397a7c3d761179a2262cb9a069e39164ddf0a38f0502fb796c8d0f4b9f86"
product: "foundry"
docsArea: "custom-widgets"
locale: "en"
upstreamTitle: "Documentation | Custom widgets > Dark theme support"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Dark theme support

Custom widgets can use the [`prefers-color-scheme` ↗](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme) CSS media feature to detect the [`color-scheme` ↗](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme) of the parent application and apply appropriate styles.

```css
.container {
    background: white;
}

@media (prefers-color-scheme: dark) {
    .container {
        background: black;
    }
}
```

Additionally, the [`window.matchMedia()` ↗](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) method can be used to detect the color scheme from JavaScript, for example to apply a theme to a component library.

```tsx
const Component: React.FC = () => {
    const isDarkTheme = useDarkTheme();
    return <Theme appearance={isDarkTheme ? "dark" : "light"}>...</Theme>;
};

const useDarkTheme = () => useMediaQuery("(prefers-color-scheme: dark)");

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);

    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    useEffect(() => {
        const mediaQueryList = window.matchMedia(query);
        setMatches(mediaQueryList.matches);
        mediaQueryList.addEventListener("change", handleChange);
        return () => {
            mediaQueryList.removeEventListener("change", handleChange);
        };
    }, [query]);

    return matches;
};
```
