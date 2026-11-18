# Codex des Blutmondes – Version 0.1

Dungeon-Crawler mit rundenbasierten Kämpfen im Pixel-2D-Stil. Die Welt stammt aus dem Codex des Blutmondes.

## Starten
`index.html` doppelklicken. Es braucht keinen Server und keine Installation. Ohne Internet fehlen nur die Pixel-Schriften; dann wird eine Ersatzschrift benutzt.

## Steuerung
| | Tastatur | Gamepad | Touch / Maus |
|---|---|---|---|
| Bewegen / Auswahl | Pfeile, WASD | Steuerkreuz, Stick | Bildschirm-Steuerkreuz, Feld antippen |
| Bestätigen | Enter, Leertaste, E | A | A-Knopf, Eintrag antippen |
| Zurück | Esc, Q | B | B-Knopf |
| Menü | Tab, I, M | Start, Y | ☰ |

## Was in Version 0.1 drin ist
- **Startmenü:** Fortsetzen, Neues Spiel, Einstellungen, Steuerung, Spiel beenden
- **Einstellungen:** Sprache (DE/EN), Schwierigkeit (Leicht bis Albtraum mit Permadeath), Inhalt U18/Ü18 (Ü18 mit Altersbestätigung), Lautstärke, Bildschirmwackeln, Touch-Steuerung, Vollbild, Spielstand löschen
- **Charakter:** 6 Völker mit eigenem Mana-Maximum, 5 Rollen, Aussehen anpassbar; Start auf Rang D
- **Stadt Aschenfurt:**
  - **Gilde:** Rangprüfung D bis SS, Aufträge (Anwerbung, Dungeon lösen, Jagd), Bestimmen schlafender Ausrüstung
  - **Dungeon-Aushang:** Fristen, die in Echtzeit ablaufen
  - **Markt:** Proviant, Tränke, Schmiedeware, Verkauf
  - **Sanktuarium:** Heilen, Wiederbeleben, Tribut dämpfen
  - **Taverne:** Rasten, Speichern, Gerüchte
- **Dungeons:** Aufbau zufällig, abhängig von Art und Rang
  - **Physisch**
  - **Dorn:** alle 20 Schritte eine Falle
  - **Blut:** dreifache Monsterdichte, kaum sichere Räume
  - **Erinnerung:** als Rang D/C getarnt, in Wahrheit A–SS; mit Erinnerungsschleifen (aktiv oder inaktiv) und Endrätsel
  - **Für alle Arten:** Einweg-Schwelle, Endboss oder Endrätsel, Proviant, sichere Räume, Sichtfeld, Minikarte
- **Kampf:** rundenbasiert nach Tempo, 15 Fertigkeiten, Statuseffekte, Tribute (Blut, Körperwärme, Ausdauer, Mana), die 7 Sünden auf S/SS-Waffen
- **Loot-Generator:** ein Standardbild je Grundtyp, Metallfarbe nach Rang. Werte, Effekte, Tribut und Sünde werden je nach Rang ausgewürfelt.
- **Blutmond:** Läuft eine Frist ab (1 Stunde echte Spielzeit), bricht der Dungeon aus. Dann werden alle Monster stärker und Physische Dungeons zu Blut-Dungeons, bis die Quelle gelöst ist.

## Aufbau
- `js/core/`: Eingabe, Sound-Synthesizer, UI-Bausteine
- `js/gfx/`: Pixel-Painter und prozeduraler Sprite-Generator (alle Grafiken entstehen im Code)
- `js/data.js`: Völker, Rollen, Fertigkeiten, Monster, Gefährten, Regeln
- `js/loot.js`, `js/dungeon.js`: Generatoren
- `js/scenes/`: Menü, Charaktererstellung, Stadt, Erkundung, Kampf
- `js/i18n.js`: alle Texte auf Deutsch und Englisch

## Noch nicht drin (geplant)
- Zufallsereignisse mit den 7 Entitäten
- Dornen-Tattoo
- Schwarzmarkt
- Musik
- Eigene Sprite-Sheets: Der Sprite-Generator lässt sich später durch Bilddateien ersetzen.
