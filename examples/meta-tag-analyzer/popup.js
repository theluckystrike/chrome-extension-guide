// popup.js - Main logic for the Meta Tag Analyzer

document.addEventListener('DOMContentLoaded', function() {
  const elements = {
    pageUrl: document.getElementById('pageUrl'),
    titleTag: document.getElementById('titleTag'),
    titleCount: document.getElementById('titleCount'),
    titleStatus: document.getElementById('titleStatus'),
    metaDescription: document.getElementById('metaDescription'),
    descCount: document.getElementById('descCount'),
    descStatus: document.getElementById('descStatus'),
    ogTitle: document.getElementById('ogTitle'),
    ogDescription: document.getElementById('ogDescription'),
    ogImage: document.getElementById('ogImage'),
    ogUrl: document.getElementById('ogUrl'),
    ogType: document.getElementById('ogType'),
    ogSiteName: document.getElementById('ogSiteName'),
    ogStatus: document.getElementById('ogStatus'),
    twitterCard: document.getElementById('twitterCard'),
    twitterTitle: document.getElementById('twitterTitle'),
    twitterDescription: document.getElementById('twitterDescription'),
    twitterImage: document.getElementById('twitterImage'),
    twitterSite: document.getElementById('twitterSite'),
    twitterStatus: document.getElementById('twitterStatus'),
    canonicalUrl: document.getElementById('canonicalUrl'),
    viewport: document.getElementById('viewport'),
    robots: document.getElementById('robots'),
    keywords: document.getElementById('keywords'),
    error: document.getElementById('error'),
    results: document.getElementById('results'),
    refreshBtn: document.getElementById('refreshBtn')
  };

  // Analyze meta tags when popup opens
  analyzePage();

  // Refresh button handler
  elements.refreshBtn.addEventListener('click', analyzePage);

  function analyzePage() {
    elements.error.classList.add('hidden');
    elements.results.classList.remove('hidden');

    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (chrome.runtime.lastError || !tabs[0]) {
        showError();
        return;
      }

      const tab = tabs[0];

      // Inject and execute content script
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractMetaTags
      }, function(results) {
        if (chrome.runtime.lastError || !results || !results[0]) {
          showError();
          return;
        }

        const metaData = results[0].result;
        displayResults(metaData);
      });
    });
  }

  // Function to be injected into the page
  function extractMetaTags() {
    function getMetaContent(propertyOrName, type) {
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

    return {
      title: document.title,
      description: getMetaContent('description', 'name'),
      keywords: getMetaContent('keywords', 'name'),
      robots: getMetaContent('robots', 'name'),
      viewport: getMetaContent('viewport', 'name'),
      ogTitle: getMetaContent('og:title', 'property'),
      ogDescription: getMetaContent('og:description', 'property'),
      ogImage: getMetaContent('og:image', 'property'),
      ogUrl: getMetaContent('og:url', 'property'),
      ogType: getMetaContent('og:type', 'property'),
      ogSiteName: getMetaContent('og:site_name', 'property'),
      twitterCard: getMetaContent('twitter:card', 'name'),
      twitterTitle: getMetaContent('twitter:title', 'name'),
      twitterDescription: getMetaContent('twitter:description', 'name'),
      twitterImage: getMetaContent('twitter:image', 'name'),
      twitterSite: getMetaContent('twitter:site', 'name'),
      canonicalUrl: (function() {
        const link = document.querySelector('link[rel="canonical"]');
        return link ? link.getAttribute('href') : '';
      })(),
      pageUrl: window.location.href
    };
  }

  function displayResults(data) {
    // Page URL
    elements.pageUrl.textContent = data.pageUrl || 'N/A';

    // Title Tag Analysis
    elements.titleTag.value = data.title || '';
    const titleLength = (data.title || '').length;
    elements.titleCount.textContent = titleLength;
    
    if (!data.title) {
      elements.titleStatus.className = 'status missing';
      elements.titleStatus.textContent = '❌ Missing title tag';
    } else if (titleLength < 30) {
      elements.titleStatus.className = 'status warning';
      elements.titleStatus.textContent = '⚠️ Title is too short (recommended: 30-60 characters)';
    } else if (titleLength > 60) {
      elements.titleStatus.className = 'status warning';
      elements.titleStatus.textContent = '⚠️ Title is too long (recommended: 30-60 characters)';
    } else {
      elements.titleStatus.className = 'status good';
      elements.titleStatus.textContent = '✅ Title length is optimal';
    }

    // Meta Description Analysis
    elements.metaDescription.value = data.description || '';
    const descLength = (data.description || '').length;
    elements.descCount.textContent = descLength;
    
    if (!data.description) {
      elements.descStatus.className = 'status missing';
      elements.descStatus.textContent = '❌ Missing meta description';
    } else if (descLength < 120) {
      elements.descStatus.className = 'status warning';
      elements.descStatus.textContent = '⚠️ Description is too short (recommended: 120-160 characters)';
    } else if (descLength > 160) {
      elements.descStatus.className = 'status warning';
      elements.descStatus.textContent = '⚠️ Description is too long (recommended: 120-160 characters)';
    } else {
      elements.descStatus.className = 'status good';
      elements.descStatus.textContent = '✅ Description length is optimal';
    }

    // Open Graph Tags
    elements.ogTitle.value = data.ogTitle || '';
    elements.ogDescription.value = data.ogDescription || '';
    elements.ogImage.value = data.ogImage || '';
    elements.ogUrl.value = data.ogUrl || '';
    elements.ogType.value = data.ogType || '';
    elements.ogSiteName.value = data.ogSiteName || '';

    const ogTags = [data.ogTitle, data.ogDescription, data.ogImage, data.ogUrl];
    const ogPresent = ogTags.filter(tag => tag).length;
    
    if (ogPresent === 0) {
      elements.ogStatus.className = 'status missing';
      elements.ogStatus.textContent = '❌ No Open Graph tags found';
    } else if (ogPresent < 4) {
      elements.ogStatus.className = 'status warning';
      elements.ogStatus.textContent = `⚠️ Partial Open Graph implementation (${ogPresent}/4 tags)`;
    } else {
      elements.ogStatus.className = 'status good';
      elements.ogStatus.textContent = '✅ All Open Graph tags present';
    }

    // Twitter Cards
    elements.twitterCard.value = data.twitterCard || '';
    elements.twitterTitle.value = data.twitterTitle || '';
    elements.twitterDescription.value = data.twitterDescription || '';
    elements.twitterImage.value = data.twitterImage || '';
    elements.twitterSite.value = data.twitterSite || '';

    const twitterTags = [data.twitterCard, data.twitterTitle, data.twitterDescription, data.twitterImage];
    const twitterPresent = twitterTags.filter(tag => tag).length;
    
    if (twitterPresent === 0) {
      elements.twitterStatus.className = 'status missing';
      elements.twitterStatus.textContent = '❌ No Twitter Cards found';
    } else if (twitterPresent < 4) {
      elements.twitterStatus.className = 'status warning';
      elements.twitterStatus.textContent = `⚠️ Partial Twitter Cards implementation (${twitterPresent}/4 tags)`;
    } else {
      elements.twitterStatus.className = 'status good';
      elements.twitterStatus.textContent = '✅ All Twitter Cards present';
    }

    // Technical Tags
    elements.canonicalUrl.value = data.canonicalUrl || '';
    elements.viewport.value = data.viewport || '';
    elements.robots.value = data.robots || '';
    elements.keywords.value = data.keywords || '';
  }

  function showError() {
    elements.error.classList.remove('hidden');
    elements.results.classList.add('hidden');
  }
});
