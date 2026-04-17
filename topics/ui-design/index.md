---
layout: topic
title: "Chrome Extension UI & Design: Popups, Side Panels, Options Pages & Theming"
description: "Learn Chrome extension UI design patterns including popup layouts, side panel interfaces, options pages, dark mode theming, and CSS best practices."
permalink: /topics/ui-design/
topic_categories:
  - UI
topic_keywords:
  - popup
  - dark mode
  - theme
  - CSS
  - design
---
# UI & Design

Designing the user interface for a Chrome extension is fundamentally different from building a standard web page. You are working within strict size constraints for popups, navigating the relatively new side panel API, and building options pages that feel native to Chrome rather than like a random website crammed into a settings tab.

Popup design is where most developers start. The popup window maxes out at 800 by 600 pixels, which forces you to prioritize ruthlessly. Every control needs to justify its presence. The best extension popups load instantly, present the most-used actions above the fold, and avoid scrolling wherever possible. Articles in this section cover layout strategies, component choices, and common pitfalls like accidentally triggering popup close events.

Side panels, introduced in Manifest V3, offer a persistent UI surface that stays open while users browse. This opens up design possibilities that popups never allowed, like step-by-step wizards, chat interfaces, or reference panels that users consult alongside the main page. The tradeoff is that side panels share horizontal screen space with the webpage, so responsive design is not optional.

Options pages are often neglected but they shape how users perceive your extension. A well-organized settings page with sensible defaults reduces support requests and makes the extension feel polished. Dark mode support has gone from a nice-to-have to a baseline expectation, and implementing it correctly across popup, side panel, and options page requires a consistent CSS variable strategy.

Below you will find practical guides on building and styling each of these surfaces.
