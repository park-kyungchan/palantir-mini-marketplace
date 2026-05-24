---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/audioTranscriptionV1/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/audioTranscriptionV1/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "44af405ea46f8b30c0f5e3928ce139a7a61ad51307fe29bbc1edaa9f21030521"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Transcribe audio into text"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Transcribe audio into text

> Supported in: Batch, Faster

Transcribes an audio file into text.

**Expression categories:** Media

## Declared arguments

* **Media reference:** The column containing media references to audio files in a media set.<br>*Expression\<Media reference>*
* *optional* **Language:** The language to detect in the input file. If no language is provided, it will be inferred from the first 30 seconds of audio.<br>*Enum\<Afrikaans, Albanian, Amharic, Arabic, Armenian, Assamese, Azerbaijani, Bashkir, Basque, Belarusian, and more ...>*
* *optional* **Output mode:** Choose between simply returning the output or returning a struct, containing both the output and any errors.<br>*Enum\<Simple, With errors>*
* *optional* **Performance mode:** The performance mode to use when running transcription. If no mode is provided, we will default to the more economical option.<br>*Enum\<More economical, More performant>*

**Output type:** *String | Struct\<ok:String, error:String>*

## Examples

### Example 1: Base case

**Description:** Transcribe the audio file

**Argument values:**

* **Media reference:** `mediaReference`
* **Language:** *null*
* **Output mode:** *null*
* **Performance mode:** *null*

| mediaReference | **Output** |
| ----- | ----- |
| {"mimeType":"audio/mpeg","reference":{"type":"mediaSetItem","mediaSetItem":{"mediaSetRid":"ri.mio.main.media-set.a", "mediaItemRid":"ri.mio.main.media-item.a"}}} | This is an example transcription from Whisper |

***

### Example 2: Null case

**Argument values:**

* **Media reference:** `Media Reference`
* **Language:** *null*
* **Output mode:** *null*
* **Performance mode:** *null*

| mediaReference | **Output** |
| ----- | ----- |
| *null* | *null* |

***
