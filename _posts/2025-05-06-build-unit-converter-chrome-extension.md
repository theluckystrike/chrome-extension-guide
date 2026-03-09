---
layout: post
title: "Build a Unit Converter Chrome Extension: Convert Measurements on Any Page"
description: "Learn how to build a unit converter Chrome extension that converts measurements on any webpage. Complete tutorial with code examples and best practices."
date: 2025-05-06
categories: [Chrome Extensions, Tutorials]
tags: [converter, utilities, chrome-extension]
keywords: "chrome extension unit converter, convert units chrome, measurement converter extension, build converter chrome, unit conversion chrome extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/05/06/build-unit-converter-chrome-extension/"
---

# Build a Unit Converter Chrome Extension: Convert Measurements on Any Page

Have you ever found yourself on a website displaying measurements in units you're unfamiliar with? Perhaps you're reading a recipe that uses metric measurements while your kitchen tools are in imperial units, or browsing an international real estate listing where square meters need to be converted to square feet. These scenarios are incredibly common, and they represent a perfect use case for a custom Chrome extension. In this comprehensive guide, we'll walk you through building a fully functional unit converter Chrome extension that works seamlessly on any webpage, allowing users to convert measurements instantly without leaving their current tab.

The demand for unit conversion tools has grown significantly as the internet connects people from different countries and industries more than ever before. Whether you're a developer looking to create a practical utility extension, a student studying international science papers, or a professional working with global clients, having a reliable unit converter at your fingertips is invaluable. By the end of this tutorial, you'll have created a complete Chrome extension that can convert length, weight, temperature, volume, and area measurements with just a few clicks.

## Why Build a Unit Converter Chrome Extension

Before diving into the technical implementation, let's explore why building a unit converter extension is an excellent project for both beginners and experienced developers. First and foremost, it solves a real problem that millions of users face daily. According to search trends, unit conversion queries consistently rank among the most common searches, indicating strong user demand for quick conversion tools.

From a development perspective, this project teaches you fundamental concepts of Chrome extension architecture. You'll work with manifest files, popup interfaces, content scripts, and message passing between different extension components. These skills are transferable to virtually any Chrome extension project you might undertake in the future.

Additionally, unit converter extensions are highly practical and useful for a broad audience. Unlike complex productivity tools or niche applications, a unit converter has universal appeal. Users in scientific fields, cooking, construction, real estate, fitness, and countless other domains regularly need to convert measurements. This means your extension has the potential for significant user adoption if published to the Chrome Web Store.

## Understanding Chrome Extension Architecture

Chrome extensions are essentially web applications that extend the functionality of the Chrome browser. They consist of several components that work together to deliver a seamless user experience. Understanding these components is crucial before we begin building our unit converter.

The manifest.json file serves as the configuration file for your extension. It tells Chrome about your extension's name, version, permissions, and the various files that comprise the extension. This is where you define what your extension can do and what resources it has access to.

Popup interfaces provide the user-facing component of your extension. When users click the extension icon in the Chrome toolbar, they see a popup HTML page. This is where users interact with your converter, selecting units and entering values. The popup is lightweight and designed for quick interactions.

Content scripts are JavaScript files that run in the context of web pages. They can read and modify the page content, allowing your extension to interact with the websites users visit. For our unit converter, we'll use content scripts to detect measurements on the page and offer inline conversions.

Background scripts handle events and maintain state across the extension. They can run even when no popup is open, making them useful for tasks like monitoring page changes or managing extension settings.

## Setting Up Your Development Environment

Let's begin building our unit converter Chrome extension. First, create a new folder on your computer to contain all the extension files. Name it "unit-converter-extension" to keep things organized.

Inside this folder, create a manifest.json file. This is the heart of your extension configuration. For a unit converter that needs to work with popup interfaces but doesn't require extensive permissions, we'll use Manifest V3, the current standard for Chrome extensions.

```json
{
  "manifest_version": 3,
  "name": "Universal Unit Converter",
  "version": "1.0",
  "description": "Convert measurements instantly on any webpage with this powerful unit converter extension.",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

This manifest defines our extension with basic functionality. The permissions array includes "activeTab" for accessing the current tab and "scripting" for running content scripts. We've also defined the popup HTML file and specified that our content script should run on all URLs.

## Creating the Popup Interface

The popup is what users see when they click your extension icon. Let's create an intuitive and user-friendly interface for our unit converter. We'll use HTML for structure and CSS for styling.

Create a popup.html file with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unit Converter</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="converter-container">
    <h1>Unit Converter</h1>
    
    <div class="conversion-type">
      <label for="conversionType">Category:</label>
      <select id="conversionType">
        <option value="length">Length</option>
        <option value="weight">Weight</option>
        <option value="temperature">Temperature</option>
        <option value="volume">Volume</option>
        <option value="area">Area</option>
      </select>
    </div>
    
    <div class="input-group">
      <input type="number" id="inputValue" placeholder="Enter value" step="any">
      <select id="fromUnit"></select>
    </div>
    
    <div class="equals">=</div>
    
    <div class="input-group">
      <input type="number" id="outputValue" placeholder="Result" step="any" readonly>
      <select id="toUnit"></select>
    </div>
    
    <button id="convertBtn">Convert</button>
    <button id="swapBtn" class="secondary">Swap Units</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Now let's style this with a modern, clean design using popup.css:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 400px;
}

.converter-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

h1 {
  font-size: 20px;
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.conversion-type {
  margin-bottom: 16px;
}

label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

select, input {
  width: 100%;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

select:focus, input:focus {
  outline: none;
  border-color: #667eea;
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.input-group input {
  flex: 1;
}

.input-group select {
  width: 100px;
}

.equals {
  text-align: center;
  font-size: 24px;
  color: #667eea;
  margin: 8px 0;
}

button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 8px;
}

#convertBtn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

#convertBtn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.swapBtn {
  background: #f0f0f0;
  color: #333;
}

.swapBtn:hover {
  background: #e0e0e0;
}
```

## Implementing the Conversion Logic

Now we need to create the JavaScript logic that powers our unit converter. The popup.js file will handle user interactions and perform the actual conversions.

```javascript
const conversionData = {
  length: {
    units: {
      meter: { name: 'Meters', symbol: 'm', toBase: 1 },
      kilometer: { name: 'Kilometers', symbol: 'km', toBase: 1000 },
      centimeter: { name: 'Centimeters', symbol: 'cm', toBase: 0.01 },
      millimeter: { name: 'Millimeters', symbol: 'mm', toBase: 0.001 },
      mile: { name: 'Miles', symbol: 'mi', toBase: 1609.344 },
      yard: { name: 'Yards', symbol: 'yd', toBase: 0.9144 },
      foot: { name: 'Feet', symbol: 'ft', toBase: 0.3048 },
      inch: { name: 'Inches', symbol: 'in', toBase: 0.0254 }
    }
  },
  weight: {
    units: {
      kilogram: { name: 'Kilograms', symbol: 'kg', toBase: 1 },
      gram: { name: 'Grams', symbol: 'g', toBase: 0.001 },
      milligram: { name: 'Milligrams', symbol: 'mg', toBase: 0.000001 },
      pound: { name: 'Pounds', symbol: 'lb', toBase: 0.453592 },
      ounce: { name: 'Ounces', symbol: 'oz', toBase: 0.0283495 },
      ton: { name: 'Metric Tons', symbol: 't', toBase: 1000 }
    }
  },
  temperature: {
    units: {
      celsius: { name: 'Celsius', symbol: '°C', toBase: 1, special: true },
      fahrenheit: { name: 'Fahrenheit', symbol: '°F', toBase: 1, special: true },
      kelvin: { name: 'Kelvin', symbol: 'K', toBase: 1, special: true }
    }
  },
  volume: {
    units: {
      liter: { name: 'Liters', symbol: 'L', toBase: 1 },
      milliliter: { name: 'Milliliters', symbol: 'mL', toBase: 0.001 },
      gallon: { name: 'Gallons (US)', symbol: 'gal', toBase: 3.78541 },
      quart: { name: 'Quarts', symbol: 'qt', toBase: 0.946353 },
      pint: { name: 'Pints', symbol: 'pt', toBase: 0.473176 },
      cup: { name: 'Cups', symbol: 'cup', toBase: 0.236588 },
      fluidounce: { name: 'Fluid Ounces', symbol: 'fl oz', toBase: 0.0295735 }
    }
  },
  area: {
    units: {
      squaremeter: { name: 'Square Meters', symbol: 'm²', toBase: 1 },
      squarekilometer: { name: 'Square Kilometers', symbol: 'km²', toBase: 1000000 },
      squarefoot: { name: 'Square Feet', symbol: 'ft²', toBase: 0.092903 },
      squareinch: { name: 'Square Inches', symbol: 'in²', toBase: 0.00064516 },
      squaremile: { name: 'Square Miles', symbol: 'mi²', toBase: 2589988.11 },
      acre: { name: 'Acres', symbol: 'ac', toBase: 4046.8564224 },
      hectare: { name: 'Hectares', symbol: 'ha', toBase: 10000 }
    }
  }
};

let currentCategory = 'length';

function initializePopup() {
  const categorySelect = document.getElementById('conversionType');
  const fromSelect = document.getElementById('fromUnit');
  const toSelect = document.getElementById('toUnit');
  
  categorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    populateUnits();
  });
  
  document.getElementById('convertBtn').addEventListener('click', performConversion);
  document.getElementById('swapBtn').addEventListener('click', swapUnits);
  
  populateUnits();
}

function populateUnits() {
  const fromSelect = document.getElementById('fromUnit');
  const toSelect = document.getElementById('toUnit');
  const units = conversionData[currentCategory].units;
  
  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';
  
  Object.keys(units).forEach(key => {
    const unit = units[key];
    fromSelect.add(new Option(`${unit.name} (${unit.symbol})`, key));
    toSelect.add(new Option(`${unit.name} (${unit.symbol})`, key));
  });
  
  // Set default selections
  if (Object.keys(units).length > 1) {
    toSelect.selectedIndex = 1;
  }
}

function performConversion() {
  const inputValue = parseFloat(document.getElementById('inputValue').value);
  const fromUnit = document.getElementById('fromUnit').value;
  const toUnit = document.getElementById('toUnit').value;
  
  if (isNaN(inputValue)) {
    document.getElementById('outputValue').value = '';
    return;
  }
  
  let result;
  
  if (currentCategory === 'temperature') {
    result = convertTemperature(inputValue, fromUnit, toUnit);
  } else {
    const fromBase = conversionData[currentCategory].units[fromUnit].toBase;
    const toBase = conversionData[currentCategory].units[toUnit].toBase;
    result = (inputValue * fromBase) / toBase;
  }
  
  document.getElementById('outputValue').value = result.toFixed(4).replace(/\.?0+$/, '');
}

function convertTemperature(value, from, to) {
  // First convert to Celsius
  let celsius;
  switch (from) {
    case 'celsius':
      celsius = value;
      break;
    case 'fahrenheit':
      celsius = (value - 32) * 5 / 9;
      break;
    case 'kelvin':
      celsius = value - 273.15;
      break;
  }
  
  // Then convert from Celsius to target
  switch (to) {
    case 'celsius':
      return celsius;
    case 'fahrenheit':
      return celsius * 9 / 5 + 32;
    case 'kelvin':
      return celsius + 273.15;
  }
}

function swapUnits() {
  const fromSelect = document.getElementById('fromUnit');
  const toSelect = document.getElementById('toUnit');
  const temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;
  
  // Also swap values if there's a result
  const inputValue = document.getElementById('inputValue').value;
  const outputValue = document.getElementById('outputValue').value;
  if (outputValue) {
    document.getElementById('inputValue').value = outputValue;
    performConversion();
  }
}

document.addEventListener('DOMContentLoaded', initializePopup);
```

This JavaScript file handles all the conversion logic. It defines conversion data for five categories: length, weight, temperature, volume, and area. Each unit has a conversion factor to its base unit, allowing for straightforward calculations. Temperature requires special handling since it doesn't use a simple multiplication factor.

## Adding Content Script Functionality

To make our extension truly powerful, let's add a content script that can detect measurements on webpages and offer inline conversions. This transforms the extension from a simple calculator into a contextual tool that enhances the user's browsing experience.

Create a content.js file:

```javascript
// Content script for detecting measurements on pages

const measurementPatterns = {
  length: /(\d+(?:\.\d+)?)\s*(meters?|m|km|centimeters?|cm|millimeters?|mm|miles?|mi|yards?|yd|feet|ft|inches?|in)\b/gi,
  weight: /(\d+(?:\.\d+)?)\s*(kilograms?|kg|grams?|g|milligrams?|mg|pounds?|lb|ounces?|oz|tons?)\b/gi,
  volume: /(\d+(?:\.\d+)?)\s*(liters?|l|milliliters?|ml|gallons?|gal|quarts?|qt|pints?|pt|cups?|fl\.?\s*oz)\b/gi,
  area: /(\d+(?:\.\d+)?)\s*(square\s*(meters?|km|feet|inches?|miles?)|m²|km²|ft²|in²|mi²|acres?|ha)\b/gi
};

function createConversionPopup() {
  const popup = document.createElement('div');
  popup.id = 'unit-converter-popup';
  popup.style.cssText = `
    position: absolute;
    background: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    max-width: 250px;
    display: none;
  `;
  document.body.appendChild(popup);
  return popup;
}

let popup = null;

function showConversionPopup(event, text, category, unit) {
  if (!popup) {
    popup = createConversionPopup();
  }
  
  const value = parseFloat(text.match(/\d+(?:\.\d+)?/)[0]);
  popup.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: 600;">Convert ${text}?</div>
    <button class="convert-btn" data-value="${value}" data-unit="${unit}" data-category="${category}">
      Convert to Common Units
    </button>
  `;
  
  popup.style.display = 'block';
  popup.style.left = `${event.pageX + 10}px`;
  popup.style.top = `${event.pageY + 10}px`;
  
  popup.querySelector('.convert-btn').addEventListener('click', (e) => {
    const btn = e.target;
    const value = btn.dataset.value;
    const unit = btn.dataset.unit;
    const category = btn.dataset.category;
    
    chrome.runtime.sendMessage({
      action: 'openPopup',
      value: value,
      unit: unit,
      category: category
    });
    
    popup.style.display = 'none';
  });
}

function hidePopup() {
  if (popup) {
    popup.style.display = 'none';
  }
}

document.addEventListener('mouseup', (event) => {
  const selection = window.getSelection().toString().trim();
  
  if (!selection) {
    hidePopup();
    return;
  }
  
  for (const [category, pattern] of Object.entries(measurementPatterns)) {
    pattern.lastIndex = 0;
    if (pattern.test(selection)) {
      const unitMatch = selection.match(/([a-zA-Z°²]+)\b/);
      if (unitMatch) {
        showConversionPopup(event, selection, category, unitMatch[1]);
        return;
      }
    }
  }
  
  hidePopup();
});

document.addEventListener('mousedown', (event) => {
  if (popup && !popup.contains(event.target)) {
    hidePopup();
  }
});
```

This content script detects when users select text on a webpage that contains measurements. It then offers a popup that allows users to quickly convert those measurements using our extension.

## Installing and Testing Your Extension

Now that we've created all the necessary files, let's test our extension in Chrome. First, you need to create simple icon files or use placeholders. For testing purposes, you can create basic colored squares.

To load your extension in Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click the "Load unpacked" button
4. Select your extension folder

Your extension should now appear in the Chrome toolbar. Click the icon to test the popup interface. Try converting various measurements to ensure all functionality works correctly.

## Publishing Your Extension

Once you've thoroughly tested your extension and are satisfied with its functionality, you can publish it to the Chrome Web Store. This requires creating a developer account and preparing your extension for distribution.

Before publishing, ensure you have proper icon files at the required sizes (16x16, 48x48, and 128x128 pixels). You should also create a clear and compelling description that highlights the key features of your unit converter.

The publication process involves packaging your extension as a ZIP file and submitting it through the Chrome Web Store Developer Dashboard. Google reviews submissions to ensure they meet quality and safety standards. Once approved, your extension becomes available to millions of Chrome users worldwide.

## Enhancements and Future Improvements

Your basic unit converter is now complete, but there's always room for improvement. Consider adding features like saved conversion history, keyboard shortcuts for quick access, support for additional unit categories like speed or pressure, or the ability to customize default units based on user preferences.

You might also enhance the content script to automatically highlight and convert all measurements on a page rather than just selected text. Another valuable addition would be offline functionality using cached conversion rates, ensuring the extension works even without an internet connection.

Building this unit converter Chrome extension has given you practical experience with core Chrome extension concepts. These skills form a solid foundation for creating more complex and sophisticated extensions in the future. Whether you continue to improve this converter or move on to new projects, the knowledge gained here will serve you well in your Chrome extension development journey.

The unit converter you built today demonstrates how relatively simple tools can provide tremendous value to users. By focusing on practical utility and clean implementation, you've created an extension that solves real problems for real users. This approach—identifying genuine needs and building elegant solutions—is what separates good extensions from great ones.
