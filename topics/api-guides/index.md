---
layout: default
title: "API Guides"
description: "Chrome extension API documentation. Tabs, storage, messaging, alarms, and more."
permalink: /topics/api-guides/
---
# API Guides

In-depth documentation for Chrome extension APIs with working examples.

{% assign posts = site.posts | where_exp: "p", "p.categories contains 'API-Guide' or p.categories contains 'APIs'" %}
{% for post in posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}
