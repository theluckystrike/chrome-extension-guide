---
layout: default
title: "Communication"
description: "Chrome extensions for email, messaging, and team communication."
permalink: /topics/communication/
---
{% raw %}
# Communication Extensions

Extensions for email, messaging, and team collaboration.

{% assign posts = site.posts | where_exp: "p", "p.title contains 'email' or p.title contains 'Email' or p.title contains 'messaging' or p.title contains 'Messaging' or p.title contains 'chat' or p.title contains 'Chat' or p.title contains 'communication' or p.title contains 'Communication' or p.title contains 'Gmail' or p.title contains 'Slack'" %}
{% for post in posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}
{% endraw %}
