# Maschinenbau-Knecht

Rechner und Formelsammlung für das Maschinenbaustudium, gebaut für den Browser auf dem iPad. Jedes Thema hat einen interaktiven Rechner, der beim Tippen neu rechnet, und darunter die Formeln mit Erklärungen.

## Themen

73 Themen in 15 Bereichen, jeweils mit Rechner (außer reinen Tabellenseiten) und Formelsammlung:

- **Statik:** Kräfte und Gleichgewicht, Balken mit Querkraft- und Momentenverlauf, Haftung und Reibung
- **Festigkeitslehre:** Zug und Wärmedehnung, Biegelinie, abgesetzte Welle (numerisch), Torsion, Mohrscher Kreis, Knicken, Schwingfestigkeit, Hertzsche Pressung, Platten, Behälter und Rohre unter Druck
- **Querschnitte & Profile:** Querschnittswerte, Stahlbauprofile IPE/HEB mit Profilauswahl, Torsion nicht kreisförmiger Querschnitte
- **Kinetik:** Einmassenschwinger, Massenträgheit und Rotation, Impuls und Stoß
- **Antriebstechnik:** Antrieb und Kupplung, Unwucht und Auswuchtgüte, Gelenkwelle, elastische Lagerung
- **Thermodynamik:** Zustandsänderungen, Kreisprozesse, Wärmedurchgang, Wärmeübertrager, Wärmeübergangskoeffizient, Wärmestrahlung, Abkühlen und Einfrieren, feuchte Luft
- **Strömungslehre:** Kennzahlen und Stoffwerte, Rohrströmung mit Moody-Diagramm, Bernoulli und Widerstand, Hydrostatik, Druck- und Durchflussmessung, Kv-Wert, Verlustbeiwerte ζ
- **Fluidtechnik:** Hydraulik, Pneumatik, Kreiselpumpe und NPSH, Ventilator
- **Lüftung & Rohrleitungen:** Luftdruck und Normvolumen, Raumlüftung, Wanddicke und Wärmedehnung, Leckrate
- **Akustik:** Schallpegel, Schallleistung (Hüllflächenverfahren), Raumakustik und Schalldämmung
- **Verbrennungsmotoren:** Kurbeltrieb, Motorkenndaten und Verbrennung
- **Toleranzen & Passungen:** ISO 286, ISO 2768, Maßketten
- **Verbindungselemente:** Schrauben (VDI 2230), Passfedern, Pressverband, Kegelpressverbindung, Klemmverbindung, Bolzen und Stifte, Schweißnähte
- **Maschinenelemente:** Wellen, Wälzlager, Stirnräder, Druckfedern, Bewegungsschrauben, Riementrieb, Kettentrieb
- **Nachschlagen:** Werkstoffkennwerte, Stoffdaten, Einheiten und Konstanten, Kennzeichnungen (IP, Ex, Rohrleitungen), Ausgleichsrechnung

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
| `src/2d-body.html` | Erweiterung: Festigkeit, Profile, Antriebstechnik, Wärme, Strömung |
| `src/2e-body.html` | Erweiterung: Fluidtechnik, Lüftung, Akustik, Motoren, Verbindungs- und Maschinenelemente, Nachschlagen |
| `src/2z-end.html` | schließende Tags des Hauptbereichs |
| `src/3a-core.js` | MathJax-Konfiguration, Hilfsfunktionen, Diagramme, Rechner-Gerüst, Rechner Statik und Festigkeitslehre |
| `src/3b-calcs.js` | Rechner Kinetik bis Maschinenelemente, ISO-286-Tabellen |
| `src/3d-calcs.js` | Rechner der Erweiterung, Profiltabellen, zusätzliche Einheiten |
| `src/3c-init.js` | Navigation, Bereichsreihenfolge, Suche, Start |

Nach einer Änderung in `src/` die Seite neu erzeugen:

```bash
./build.sh
```

Ein neuer Rechner braucht zwei Teile: eine `<section class="topic">` mit `<div class="calc" data-calc="name">` in einer der Body-Dateien und einen Aufruf `calc('name', { fields, compute })` in den Skripten.

## Hinweis

Werkstoff-, Reib- und Normwerte sind Richtwerte für Studium und Vorauslegung. Für eine Auslegung, die gebaut wird, gelten die aktuellen Normen und Herstellerangaben.
