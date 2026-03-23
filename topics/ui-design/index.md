---
layout: default
title: "UI & Design"
description: "Chrome extension UI design patterns. Popups, sidepanels, options pages, and styling."
permalink: /topics/ui-design/
---
{% raw %}
# UI & Design

Popup design, side panels, options pages, theming, and visual polish for Chrome extensions.

{% assign posts = site.posts | where_exp: "p", "p.categories contains 'UI'" %}
{% for post in posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}

{% assign posts2 = site.posts | where_exp: "p", "p.title contains 'popup' or p.title contains 'Popup' or p.title contains 'dark mode' or p.title contains 'Dark Mode' or p.title contains 'theme' or p.title contains 'Theme' or p.title contains 'CSS' or p.title contains 'design' or p.title contains 'Design'" %}
{% for post in posts2 %}{% unless posts contains post %}
- [{{ post.title }}]({{ post.url }})
{% endunless %}{% endfor %}
{% endraw %}
