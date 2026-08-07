/*
 * Focus Reader — Copyright (C) 2026 Behnam Azimi (b8hnam)
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
 * Public License for more details. You should have received a copy of the
 * GNU General Public License along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 *
 * The name "Focus Reader", the byB8 and b8hnam names, and the logo and icon
 * files are NOT covered by this licence — see TRADEMARK.md.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* ============================================================
 *  Focus Reader — colour system
 *  byB8 · https://by.b8hnam.com/
 *
 *  Brand: #411530 (deep plum) and #FF3000 (signal orange).
 *  Every surface is derived from one hue so a random accent
 *  still produces a coherent, readable theme.
 *  ============================================================ */

(() => {
  const BRAND_HUE = 318;

  function tone(mode, dark) {
    if (mode === "brand") {
      return {
        hue: BRAND_HUE, sat: dark ? 32 : 26,
        accent: dark ? "#ff5a33" : "#ff3000",
        accentText: dark ? "#ff8f74" : "#c42400",
        accentInk: dark ? "#2b0d20" : "#ffffff",
        accentSoft: dark ? "rgba(255,90,51,.20)" : "rgba(255,48,0,.13)"
      };
    }
    if (mode === "moss") {
      return {
        hue: 168, sat: dark ? 14 : 12,
        accent: dark ? "#57d6b4" : "#0f8a72",
        accentText: dark ? "#7fe0c6" : "#0d7a64",
        accentInk: dark ? "#05241d" : "#ffffff",
        accentSoft: dark ? "rgba(87,214,180,.18)" : "rgba(15,138,114,.13)"
      };
    }
    const h = ((Number(mode) % 360) + 360) % 360;
    return {
      hue: h, sat: dark ? 16 : 14,
      accent: dark ? `hsl(${h} 64% 64%)` : `hsl(${h} 68% 40%)`,
      accentText: dark ? `hsl(${h} 68% 76%)` : `hsl(${h} 70% 32%)`,
      accentInk: dark ? `hsl(${h} 55% 11%)` : "#ffffff",
      accentSoft: dark ? `hsla(${h},64%,64%,.18)` : `hsla(${h},68%,40%,.13)`
    };
  }

  function palette(mode, dark) {
    const c = tone(mode || "brand", !!dark);
    const h = c.hue;
    const base = {
      "--accent": c.accent,
      "--accent-ink": c.accentInk,
      "--accent-text": c.accentText,
      "--accent-soft": c.accentSoft
    };

    if (dark) {
      return Object.assign(base, {
        "--glass": `hsla(${h},${c.sat}%,17%,.62)`,
        "--solid": `hsla(${h},${c.sat}%,12%,.82)`,
        "--sheet": "rgba(255,255,255,.06)",
        "--chip": "rgba(255,255,255,.10)",
        "--ink": `hsl(${h} 16% 95%)`,
        "--muted": `hsla(${h},10%,92%,.56)`,
        "--hair": "rgba(255,255,255,.14)",
        "--edge": "rgba(255,255,255,.10)",
        "--danger": "#ff6f61",
        "--scrim": `hsla(${h},30%,4%,.46)`,
        "--sheen": "linear-gradient(155deg, rgba(255,255,255,.17), rgba(255,255,255,0) 44%)",
        "--lift": "0 32px 72px rgba(0,0,0,.55), 0 4px 14px rgba(0,0,0,.4)"
      });
    }

    return Object.assign(base, {
      "--glass": `hsla(${h},26%,99%,.55)`,
      "--solid": `hsla(${h},22%,99%,.76)`,
      "--sheet": `hsla(${h},22%,96%,.55)`,
      "--chip": `hsla(${h},20%,100%,.62)`,
      "--ink": `hsl(${h} 20% 10%)`,
      "--muted": `hsla(${h},14%,20%,.58)`,
      "--hair": "rgba(255,255,255,.72)",
      "--edge": `hsla(${h},18%,12%,.10)`,
      "--danger": "#e04a3c",
      "--scrim": `hsla(${h},20%,10%,.20)`,
      "--sheen": "linear-gradient(155deg, rgba(255,255,255,.58), rgba(255,255,255,0) 44%)",
      "--lift": "0 32px 72px rgba(10,14,18,.24), 0 4px 14px rgba(10,14,18,.10)"
    });
  }

  function paint(el, mode, dark) {
    const vars = palette(mode, dark);
    for (const key in vars) el.style.setProperty(key, vars[key]);
  }

  /* A random accent only ever rolls the hue — lightness and saturation stay
     inside the safe band, so the result is always readable. */
  const rollHue = () => Math.floor(Math.random() * 360);

  self.B8Palette = { palette, paint, rollHue, BRAND_HUE };
})();
