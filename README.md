# Dash:next

Experimental UI enhancements for Zyte [dashboard](https://app.zyte.com/) via browser extension.

## Purpose

The extension serves as a playground to try out some useful UI elements and features.
The successful ones might end up being incorporated into Dash.

## List of Enhancements

1. `job-stats`

    Adds chronological stats data viz to the main job page (i.e. `https://app.zyte.com/p/*/*/*`).
    Every stats field is displayed as a time series of relative changes for the last 7 jobs.
    The obtained data viz can be exported as SVG/PNG file.

## Installation

Currently the extension is alpha, so:

- it's not branded (no icons, "About" pages, etc.);
- it's not published to Chrome Web Store;
- it's not ported to Firefox.

You could try it out in [Chrome's Developer mode](https://developer.chrome.com/extensions/getstarted#manifest):

1. clone it `git clone git@github.com:alexander-matsievsky/dash-next.git /tmp/dash-next`;
1. open the Extension Management page by navigating to `chrome://extensions`;
1. enable Developer Mode by clicking the toggle switch next to **Developer mode**;
1. click the **LOAD UNPACKED** button and select `/tmp/dash-next`.
