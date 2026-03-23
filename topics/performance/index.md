---
layout: default
title: "Performance"
description: "Chrome extension performance optimization. Memory management, profiling, and speed improvements."
permalink: /topics/performance/
---
# Performance

Memory management, profiling, speed optimization, and building lightweight extensions.

{% assign posts = site.posts | where_exp: "p", "p.categories contains 'Performance'" %}
{% for post in posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}

{% assign posts2 = site.posts | where_exp: "p", "p.title contains 'performance' or p.title contains 'Performance' or p.title contains 'memory' or p.title contains 'Memory'" %}
{% for post in posts2 %}{% unless posts contains post %}
- [{{ post.title }}]({{ post.url }})
{% endunless %}{% endfor %}
