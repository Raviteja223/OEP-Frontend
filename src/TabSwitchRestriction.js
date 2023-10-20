// TabSwitchRestriction.js
import React, { useEffect } from 'react';

const TabSwitchRestriction = () => {
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = ''; // This empty string will be displayed as the confirmation message.

      // You can customize the message to inform the user why they can't leave the page.
      // event.returnValue = 'Are you sure you want to leave this page? Your unsaved changes may be lost.';
    };

    // Attach the event listener when the component mounts.
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Remove the event listener when the component unmounts.
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <></>; // This component doesn't render anything visible.
};

export default TabSwitchRestriction;
