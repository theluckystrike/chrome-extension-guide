---
layout: default
title: "Tutorials"
description: "Step-by-step Chrome extension tutorials. Build real extensions from scratch."
permalink: /topics/tutorials/
---
# Tutorials

Hands-on guides to building Chrome extensions from scratch.

{% assign posts = site.posts | where_exp: "p", "p.categories contains 'Tutorial' or p.categories contains 'Tutorials' or p.categories contains 'tutorials'" %}
{% for post in posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}
