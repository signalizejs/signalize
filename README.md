<br>

<p align="center">
	<a href="https://signalizejs.com" target="_blank" rel="noopener noreferrer">
		<img src="https://signalizejs.com/images/logo/horizontal.svg?v2" height="100" alt="SignalizeJS logo">
	</a>
</p>

<br>

<p align="center">
<a href="https://discord.com/invite/V82TvAVRKY"><img src="https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true" alt="Chat"></a>
<a href="https://github.com/signalizejs/packages/discussions"><img src="https://user-images.githubusercontent.com/14016808/132510133-76bb66a9-951f-4411-9236-140cac7b7472.png"></a>
<a href="https://twitter.com/signalizejs"><img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/stylifycss?style=social"></a>
<a href="https://github.com/signalizejs/packages"><img alt="GitHub Org's stars" src="https://img.shields.io/github/stars/signalizejs/packages?style=social"></a>
<a href="https://github.com/signalizejs/packages/blob/master/LICENSE"><img alt="GitHub" src="https://img.shields.io/github/license/signalizejs/packages"></a>
<br>
<a href="(https://github.com/signalizejs/packages/actions/workflows/tests.yaml"><img alt="GitHub Workflow Status (branch)" src="https://github.com/signalizejs/packages/actions/workflows/tests.yaml/badge.svg"></a>
<a href="https://codecov.io/gh/signalizejs/packages"><img src="https://codecov.io/gh/signalizejs/packages/branch/master/graph/badge.svg?token=ZJLKX877DF"/></a>
<a href="https://github.com/signalizejs/packages/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/signalizejs/packages"></a>
<a href="https://github.com/signalizejs/packages"><img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/signalizejs/packages"></a>
<a href="https://github.com/signalizejs/packages/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/signalizejs/packages"></a>
<a href="https://github.com/signalizejs/packages"><img alt="GitHub contributors" src="https://img.shields.io/github/contributors/signalizejs/packages"></a>
</p>

## ✨ Introduction

SignalizeJS is a client-side, multipurpose, dependency-less, easily extensible, plugin based microframework that uses Signals and Events under the hood.
- 💎 Small learning curve
- 💎 Small size - Core 3 KB. Vue-Like Directives + Core = 5 KB
- 💎 Plugin based - import only what you need
- 💎 No dependencies

## 🤔 Why?
- I had enough of compilicated JS backends and frameworks (just use Astro, Go, Laravel, Symfony, Nette... I even tried Rust, because of [Prime](https://www.youtube.com/watch?v=h7UEwBaGoVo), and even that was "relief" compared to JS ecosystem).
- I missed some features.
- I wanted a small, dead simple library that can be easily maintainable.
- I wrote a few utilities to reduce the boilerplate code.
- Eventually, I composed that into a framework that is like jQuery with Signals & Directives `¯\_(ツ)_/¯`.

## 📦 Ecosystem
The main recommended package to use is [signalizejs](). It contains core + directives plugin.
If you don't want directives, you can use signalizejs/core and import only those plugins you want.
`signalizejs` or `signalizejs/core` must always be always the first import.

| Package               |  Description                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------|
| [ajax]                | A small wrapper around fetch.                                                           |
| [asset-loader]        | Tool for loading CSS and JS asynchronously (on demand).                                 |
| [core]                | The functional Corre for Signalizejs package.                                           |
| [dialog]              | Wrapper around native dialog functionality.                                             |
| [directives]          | Vue-like directives.                                                                    |
| [h]                   | Hyperscript.                                                                            |
| [logger]              | Wrapper around onerror and console.error for sending JS errors to server.               |
| [snippets]            | Tool for redrawing elements and their attributes based on HTML input.                   |
| [spa]                 | This package turns your website to SPA.                                                 |

[ajax]: https://signalizejs
[asset-loader]: https://signalizejs
[core]: https://signalizejs
[dialog]: https://signalizejs
[directives]: https://signalizejs
[h]: https://signalizejs
[logger]: https://signalizejs
[snippets]: https://signalizejs
[spa]: https://signalizejs

## Compatibility
[ES5-compliant browsers](https://caniuse.com/?search=ES5)

## 💡 Examples, Changelog, Issues
- Live examples and tutorials: [documentation](https://signalizejs.com/docs/get-started)
- Changelog and release changes: [releases](https://github.com/signalizejs/packages/releases)
- Have an idea? Found a bug? Feel free to create an [issue](https://github.com/signalizejs/packages/issues)

## 🤟 Stay In Touch

- Visit Stylify website [https://signalizejs.com](https://signalizejs.com).
- Follow Stylify on [Twitter](https://twitter.com/signalizejs).
- Join Stylify community on [Discord](https://discord.com/invite/V82TvAVRKY).

## 👷 Contributing
Please make sure to read the [Contributing Guide](https://github.com/signalizejs/packages/blob/master/.github/CODE_OF_CONDUCT.md) before making a pull request.

## 📝 License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2021-present, Vladimír Macháček
