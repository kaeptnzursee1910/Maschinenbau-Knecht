# Maschinenbau-Knecht

Rechner und Formelsammlung für das Maschinenbaustudium, gebaut für den Browser auf dem iPad. Jedes Thema hat einen interaktiven Rechner, der beim Tippen neu rechnet, und darunter die Formeln mit Erklärungen.

## Themen

- **Statik:** Kräfte und Gleichgewicht, Balken mit Querkraft- und Momentenverlauf, Haftung und Reibung
- **Festigkeitslehre:** Zug und Wärmedehnung, Querschnittswerte, Biegelinie, Torsion, Mohrscher Kreis, Knicken, Schwingfestigkeit
- **Kinetik:** Einmassenschwinger, Massenträgheit und Rotation, Impuls und Stoß
- **Thermodynamik:** Zustandsänderungen idealer Gase, Kreisprozesse, Wärmedurchgang, Wärmeübertrager
- **Strömungslehre:** Kennzahlen und Stoffwerte, Rohrströmung mit Moody-Diagramm, Bernoulli und Widerstand
- **Toleranzen und Passungen:** ISO 286, ISO 2768, Maßketten
- **Maschinenelemente:** Schrauben (VDI 2230), Wellen, Passfedern, Pressverband, Wälzlager, Stirnräder, Druckfedern
- **Nachschlagen:** Werkstoffkennwerte, Einheiten und Konstanten

## Benutzen

`index.html` ist eine einzelne, eigenständige Seite. Im Browser öffnen genügt. Auf dem iPad bekommst du sie über „Teilen → Zum Home-Bildschirm“ wie eine App aufs iPad, wenn die Seite gehostet ist (z. B. über GitHub Pages).

Die Formeln werden mit MathJax von cdn.jsdelivr.net gesetzt, die Schriften kommen von Google Fonts. Ohne Internetverbindung funktionieren die Rechner trotzdem; die Formeln erscheinen dann als TeX-Quelltext.

## Aufbau des Codes

`index.html` wird aus den Dateien in `src/` zusammengesetzt:

| Datei | Inhalt |
| --- | --- |
| `src/1-head.html` | Titel, Schriften, CSS |
| `src/2a-body.html` | Kopfleiste, Navigation, Übersicht, Statik, Festigkeitslehre |
| `src/2b-body.html` | Kinetik, Thermodynamik, Strömungslehre |
| `src/2c-body.html` | Toleranzen, Maschinenelemente, Nachschlagen |
| `src/3a-core.js` | MathJax-Konfiguration, Hilfsfunktionen, Diagramme, Rechner-Gerüst, Rechner Statik und Festigkeitslehre |
| `src/3b-calcs.js` | übrige Rechner und ISO-286-Tabellen |
| `src/3c-init.js` | Navigation, Suche, Start |

Nach einer Änderung in `src/` die Seite neu erzeugen:

```bash
./build.sh
```

Ein neuer Rechner braucht zwei Teile: eine `<section class="topic">` mit `<div class="calc" data-calc="name">` in einer der Body-Dateien und einen Aufruf `calc('name', { fields, compute })` in den Skripten.

## Hinweis

Werkstoff-, Reib- und Normwerte sind Richtwerte für Studium und Vorauslegung. Für eine Auslegung, die gebaut wird, gelten die aktuellen Normen und Herstellerangaben.
