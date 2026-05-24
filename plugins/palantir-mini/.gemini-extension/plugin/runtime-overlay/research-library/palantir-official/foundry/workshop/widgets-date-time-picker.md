---
sourceUrl: "https://www.palantir.com/docs/foundry/workshop/widgets-date-time-picker/"
canonicalUrl: "https://palantir.com/docs/foundry/workshop/widgets-date-time-picker/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "f1e97d9bc22178c34adecffb7d98141dcf715e71a08befbfa0c02983bfb1d12f"
product: "foundry"
docsArea: "workshop"
locale: "en"
upstreamTitle: "Documentation | Filtering widgets > Date and Time Picker"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Date and Time Picker

The Date and Time Picker widget can be used to allow a user to enter a single date and time value.

<img src="./media/widgets-date-time-picker.png" alt="Date time picker example" width=300>

## Configuration Options

* **Label**
  * Sets an optional label for the widget. This text is displayed across the top of the widget.
* **Selected timestamp**
  * Output variable of the widget, storing the user’s selected date and time value.
* **Date format**
  * Sets the date format displayed by the widget.
* **Time format**
  * Sets the time format displayed by the widget, either using a 12-hour clock or a 24-hour clock.
* **Time precision**
  * Sets the time precision used by the widget, down to the millisecond, second, or minute.
* **Timezone user editable**
  * Toggle controlling whether or not the timezone of the widget is adjustable in view mode by the user.
* **Default timezone**
  * Sets the default timezone used by the widget. This can be set statically by manually selecting the timezone, dynamically using a variable, or set to local which uses the viewer’s local timezone.
