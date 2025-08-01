import React, { useEffect } from 'react';

const TabReset = ({ activeTab, setActiveTab }) => {
  console.log("TabReset component: activeTab =", activeTab);
  
  // First useEffect - moved to the top level
  useEffect(() => {
    if (activeTab === 'subscription') {
      console.log("Subscription tab is active, should not reset");
    }
    
    // Don't reset tabs if we're on a special route
    if (window.location.pathname !== "/") {
      return;
    }
    
    // Add 'subscription' to this list of valid tabs
    const validTabs = ['registry', 'breeding', 'clinical', 'users', 'subscription'];
    
    if (!validTabs.includes(activeTab)) {
      console.log(`Invalid tab "${activeTab}", resetting to registry`);
      setActiveTab('registry');
    }
  }, [activeTab, setActiveTab]);
  
  // Second useEffect - also at the top level
  useEffect(() => {
    // Any other effects you need
    console.log("TabReset additional effect running");
    
    // Add your additional logic here if needed
  }, [activeTab]);
  
  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.closest('[role="tab"]')) {
        const tabElement = e.target.closest('[role="tab"]');
        const tabValue = tabElement.getAttribute('value');
        if (tabValue) {
          console.log("Tab clicked with value:", tabValue);
          setActiveTab(tabValue);
        }
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [setActiveTab]);
  
  useEffect(() => {
    const handleUrlChange = () => {
      const tabFromURL = new URLSearchParams(window.location.search).get('tab');
      if (tabFromURL && ['registry', 'breeding', 'clinical', 'subscription'].includes(tabFromURL)) {
        console.log("Setting tab from URL:", tabFromURL);
        setActiveTab(tabFromURL);
      }
    };
    
    // Listen for URL changes
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [setActiveTab]);
  
  return null;
};

export default TabReset;