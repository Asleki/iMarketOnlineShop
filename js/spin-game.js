const wheel = document.getElementById('prize-wheel');
const spinBtn = document.getElementById('spin-button');
const resultMessage = document.getElementById('result-message');
const prizeDisplay = document.getElementById('prize-display');
const prizeImage = document.getElementById('prize-image');
const prizeName = document.getElementById('prize-name');
const prizeValue = document.getElementById('prize-value');
const scrollToTopBtn = document.getElementById('scroll-to-top-btn');

let isSpinning = false;
let spinsLeft = 3;

// Hardcoded product data
const clickNGetProducts = [
    { id: "prod_C&G_044", name: "Bluetooth Soundbar", images: ["https://placehold.co/600x400/A0D0B0/000000?text=Soundbar+Main"], price: 28000.00 },
    { id: "prod_C&G_045", name: "Smart Air Purifier", images: ["https://placehold.co/600x400/D0D0F0/000000?text=AirPurifier+Main"], price: 16000.00 },
    { id: "prod_C&G_046", name: "Smart Water Bottle", images: ["https://placehold.co/600x400/A0E0F0/000000?text=SmartBottle+Main"], price: 6000.00 },
    { id: "prod_C&G_047", name: "Gaming Keyboard", images: ["https://placehold.co/600x400/D0F0C0/000000?text=GamingKeyboard+Main"], price: 9800.00 },
    { id: "prod_C&G_048", name: "Smart Scale", images: ["https://placehold.co/600x400/B0E0D0/000000?text=BodyCompScale+Main"], price: 7500.00 },
    { id: "prod_C&G_049", name: "Electric Rice Cooker", images: ["https://placehold.co/600x400/E0F0C0/000000?text=RiceCooker+Main"], price: 5000.00 },
    { id: "prod_C&G_050", name: "Smart LED Desk Lamp", images: ["https://placehold.co/600x400/D0A0A0/000000?text=DeskLamp+Main"], price: 6800.00 }
];

const joyTotesProducts = [
    { id: "jt_bag_002", name: "Compact Crossbody Bag", images: ["https://placehold.co/600x400/A0F0D0/000000?text=Crossbody+Bag"], price: 3200 },
    { id: "jt_bag_003", name: "Everyday Backpack", images: ["https://placehold.co/600x400/E0D0F0/000000?text=Everyday+Backpack"], price: 4500 },
    { id: "jt_bag_004", name: "Elegant Evening Clutch", images: ["https://placehold.co/600x400/F0E0C0/000000?text=Evening+Clutch"], price: 2800 },
    { id: "jt_bag_005", name: "Spacious Travel Duffel", images: ["https://placehold.co/600x400/C0B0A0/000000?text=Travel+Duffel"], price: 6000 },
    { id: "jt_bag_006", name: "Chic Shoulder Bag", images: ["https://placehold.co/600x400/A0C0E0/000000?text=Shoulder+Bag"], price: 4800 },
    { id: "jt_bag_007", name: "Casual Canvas Sling", images: ["https://placehold.co/600x400/F0D0E0/000000?text=Canvas+Sling"], price: 2500 },
    { id: "jt_bag_008", name: "Luxury Designer Handbag", images: ["https://placehold.co/600x400/C0A0F0/000000?text=Designer+Handbag"], price: 18000 }
];

const nashaaKicksProducts = [
    { id: "nk_shoe_002", name: "Women's Ballet Flats", images: ["https://placehold.co/600x400/D0F0A0/000000?text=Ballet+Flats"], price: 4500 },
    { id: "nk_shoe_003", name: "Canvas Sneakers", images: ["https://placehold.co/600x400/A0C0B0/000000?text=Canvas+Sneakers"], price: 3200 },
    { id: "nk_shoe_004", name: "Kids' Velcro Play Shoes", images: ["https://placehold.co/600x400/E0B0A0/000000?text=Kids+Shoes"], price: 2500 },
    { id: "nk_shoe_005", name: "Men's Formal Oxfords", images: ["https://placehold.co/600x400/B0A0C0/000000?text=Formal+Oxfords"], price: 12000 },
    { id: "nk_shoe_006", name: "Women's High Heel Pumps", images: ["https://placehold.co/600x400/F0A0B0/000000?text=High+Heels"], price: 7800 },
    { id: "nk_shoe_007", name: "Unisex Sports Sandals", images: ["https://placehold.co/600x400/C0F0B0/000000?text=Sports+Sandals"], price: 3000 }
];

const starsPrize = {
    name: "100 Stars",
    image: "https://placehold.co/100x100/FFD700/000000?text=✨+100+Stars",
    value: "100 Stars"
};

function getSpinPrizes() {
    const allProducts = [
        clickNGetProducts,
        joyTotesProducts,
        nashaaKicksProducts
    ];

    const selectedPrizes = [];
    for (const shop of allProducts) {
        const randomIndex = Math.floor(Math.random() * shop.length);
        selectedPrizes.push(shop[randomIndex]);
    }
    selectedPrizes.push(starsPrize);
    return selectedPrizes;
}

const prizes = getSpinPrizes();

function generateWheelSections() {
    wheel.innerHTML = ''; 
    prizes.forEach((prize, index) => {
        const section = document.createElement('div');
        section.className = 'wheel-section';
        
        const prizeImageSrc = prize.name === "100 Stars" ? prize.image : prize.images[0];
        const sectionContent = `
            <div class="prize-content">
                <img src="${prizeImageSrc}" alt="${prize.name}">
            </div>
        `;
        
        section.innerHTML = sectionContent;
        wheel.appendChild(section);
    });
}

generateWheelSections();

function displayPrize(prize) {
    prizeImage.src = prize.name === "100 Stars" ? prize.image : prize.images[0];
    prizeImage.alt = prize.name;
    prizeName.textContent = prize.name;
    if (prize.name === "100 Stars") {
        prizeValue.textContent = "You've won 100 Stars! Redeem them on your next purchase.";
    } else {
        prizeValue.textContent = `You've won a ${prize.name}!`;
    }
    prizeDisplay.classList.add('visible');
}

spinBtn.addEventListener('click', () => {
    if (isSpinning || spinsLeft <= 0) {
        resultMessage.textContent = "You've used all your free spins!";
        spinBtn.disabled = true;
        return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    prizeDisplay.classList.remove('visible');

    const winningIndex = Math.floor(Math.random() * prizes.length);
    const winningPrize = prizes[winningIndex];

    const totalDegrees = 360 * 5; 
    const sectionDegrees = 360 / prizes.length;
    const landingRotation = totalDegrees + 180 - (winningIndex * sectionDegrees);
    
    wheel.style.transition = 'transform 4s cubic-bezier(0.2, 0.8, 0.4, 1)';
    wheel.style.transform = `rotate(${landingRotation}deg)`;

    wheel.addEventListener('transitionend', () => {
        isSpinning = false;
        spinsLeft--;
        
        displayPrize(winningPrize);
        resultMessage.textContent = `You have ${spinsLeft} free spins remaining.`;
        
        if (spinsLeft > 0) {
            spinBtn.disabled = false;
        } else {
            spinBtn.disabled = true;
        }

        const finalRotation = 180 - (winningIndex * sectionDegrees);
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${finalRotation}deg)`;
    }, { once: true });
});

// Scroll to top button functionality
window.addEventListener('scroll', () => {
    if (window.scrollY > 200) {
        scrollToTopBtn.style.display = 'flex';
    } else {
        scrollToTopBtn.style.display = 'none';
    }
});

scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});