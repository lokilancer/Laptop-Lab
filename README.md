# Laptop Lab

An expedition-styled browser app that tests your laptop hardware. Nothing to install, nothing uploaded.

## Checks
- **Display**: full-screen color fills for dead pixels and backlight, plus screen info.
- **Camera**: live preview with real resolution and frame rate.
- **Microphone**: level meter with peak hold.
- **Touchpad & mouse**: clicks, double clicks, scroll, pinch, input type and move events per second.
- **Keyboard**: on-screen layout that marks every key you press, held keys and rollover. Works on built-in laptop keyboards.
- **Speakers**: left, right and both-channel tones, pitch choice, a 100 Hz to 10 kHz sweep and output selection (Chrome/Edge).
- **Battery**: charge level and charging state (Chrome, Edge, Opera).
- **System**: CPU threads, approximate memory, graphics, language, time zone and connection.

Each completed check earns a stamp on the Home page. The **Field report** page lists every result and can be downloaded as text or JSON, or printed. Results are saved in your browser only.

## Run
Camera and microphone need HTTPS or localhost.

```bash
python3 -m http.server 8000   # open http://localhost:8000
```
Or deploy with GitHub Pages.

The Home page shows which checks your browser supports. Chrome and Edge support everything; Firefox and Safari lack battery info and output selection. Browsers can test hardware but can't change system settings such as brightness or key mappings.

MIT License
