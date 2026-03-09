// content.js - Extracts meta tags from the current page

(function() {
  // Function to get meta tag content
  function getMetaContent(propertyOrName, type = 'name') {
    let content = null;
    
    if (type === 'property') {
      const meta = document.querySelector(`meta[property="${propertyOrName}"]`);
      content = meta ? meta.getAttribute('content') : null;
    } else {
      const meta = document.querySelector(`meta[name="${propertyOrName}"]`);
      content = meta ? meta.getAttribute('content') : null;
    }
    
    return content || '';
  }

  // Extract all relevant meta tags
  const metaData = {
    // Basic meta tags
    title: document.title,
    description: getMetaContent('description', 'name'),
    keywords: getMetaContent('keywords', 'name'),
    author: getMetaContent('author', 'name'),
    robots: getMetaContent('robots', 'name'),
    viewport: getMetaContent('viewport', 'name'),
    
    // Open Graph tags
    ogTitle: getMetaContent('og:title', 'property'),
    ogDescription: getMetaContent('og:description', 'property'),
    ogImage: getMetaContent('og:image', 'property'),
    ogUrl: getMetaContent('og:url', 'property'),
    ogType: getMetaContent('og:type', 'property'),
    ogSiteName: getMetaContent('og:site_name', 'property'),
    
    // Twitter Card tags
    twitterCard: getMetaContent('twitter:card', 'name'),
    twitterTitle: getMetaContent('twitter:title', 'name'),
    twitterDescription: getMetaContent('twitter:description', 'name'),
    twitterImage: getMetaContent('twitter:image', 'name'),
    twitterSite: getMetaContent('twitter:site', 'name'),
    twitterCreator: getMetaContent('twitter:creator', 'name'),
    
    // Canonical URL
    canonicalUrl: (function() {
      const link = document.querySelector('link[rel="canonical"]');
      return link ? link.getAttribute('href') : '';
    })(),
    
    // Page URL
    pageUrl: window.location.href
  };

  // Send data to popup
  chrome.runtime.sendMessage({
    action: 'metaData',
    data: metaData
  });
})();
