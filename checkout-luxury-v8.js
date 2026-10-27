/* UI-only: hide lengthy checkout when the shopping bag is empty. */
(()=>{const drawer=document.getElementById('drawer');const items=document.getElementById('cartItems');if(!drawer||!items)return;const sync=()=>{drawer.classList.toggle('store-empty',!items.querySelector('.cart-entry'));};new MutationObserver(sync).observe(items,{childList:true,subtree:false});sync();})();
