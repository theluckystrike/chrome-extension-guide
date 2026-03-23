---
layout: default
title: "Developer Tools"
description: "Chrome extensions for web developers. Debugging, performance profiling, API testing, and code inspection."
permalink: /topics/developer-tools/
---
# Developer Tools

Extensions for debugging, performance profiling, API testing, and code inspection.

{% assign posts = site.posts | where_exp: "p", "p.categories contains 'Developer-Tools' or p.categories contains 'Development' or p.categories contains 'development'" %}
{% for post in posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}
