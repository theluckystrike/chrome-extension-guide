---
layout: default
title: "Productivity Extensions"
description: "Chrome extensions that actually make you more productive. Tab management, workflow automation, and focus tools."
permalink: /topics/productivity/
---
{% raw %}
# Productivity Extensions

Tab management, workflow automation, focus tools, and extensions that save you real time.

{% assign posts = site.posts | where_exp: "p", "p.categories contains 'Productivity'" %}
{% for post in posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}

{% assign posts2 = site.posts | where_exp: "p", "p.title contains 'productivity' or p.title contains 'Productivity' or p.title contains 'tab' or p.title contains 'Tab'" %}
{% for post in posts2 %}{% unless posts contains post %}
- [{{ post.title }}]({{ post.url }})
{% endunless %}{% endfor %}
{% endraw %}
