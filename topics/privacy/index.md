---
layout: default
title: "Privacy & Security"
description: "Chrome extension privacy and security guides. Permission audits, data protection, and safe browsing."
permalink: /topics/privacy/
---
{% raw %}
# Privacy & Security

Permission audits, data protection, secure development practices, and safe browsing extensions.

{% assign posts = site.posts | where_exp: "p", "p.categories contains 'Privacy' or p.categories contains 'Security' or p.categories contains 'security'" %}
{% for post in posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}

{% assign posts2 = site.posts | where_exp: "p", "p.title contains 'privacy' or p.title contains 'Privacy' or p.title contains 'security' or p.title contains 'Security' or p.title contains 'permission' or p.title contains 'Permission'" %}
{% for post in posts2 %}{% unless posts contains post %}
- [{{ post.title }}]({{ post.url }})
{% endunless %}{% endfor %}
{% endraw %}
