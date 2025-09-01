// File: js/advertise.js
// This script handles the multi-step ad submission form, dynamic content,
// and mock data submission for the advertise-form.html page.

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const form = document.getElementById('ad-submission-form');
    const stepperSteps = document.querySelectorAll('.stepper-step');
    const stepContents = document.querySelectorAll('.step-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    let currentStep = 1;

    // Data to be submitted (in memory for this front-end only site)
    let adData = {};

    // 1. Initialize the page with URL parameters
    const packageType = urlParams.get('package');
    const price = urlParams.get('price');

    if (packageType && price) {
        document.getElementById('selected-package').textContent = packageType;
        document.getElementById('total-price').textContent = new Intl.NumberFormat('en-KE').format(price);
        document.getElementById('payment-amount').textContent = new Intl.NumberFormat('en-KE').format(price);
        
        adData.package = packageType;
        adData.price = parseFloat(price);
        adData.period = urlParams.get('period');

    } else {
        console.warn("No package or price found in URL. Redirecting to advertise page.");
        // Redirect to the packages page if URL params are missing
        window.location.href = 'advertise.html';
        return;
    }

    // 2. Stepper Navigation Logic
    function showStep(step) {
        // Hide all steps
        stepContents.forEach(content => content.classList.add('hidden'));
        // Show the current step
        document.getElementById(`step-${step}`).classList.remove('hidden');

        // Update stepper progress
        stepperSteps.forEach((stepEl, index) => {
            stepEl.classList.remove('active', 'completed');
            if (index < step - 1) {
                stepEl.classList.add('completed');
            } else if (index === step - 1) {
                stepEl.classList.add('active');
            }
        });

        // Update button visibility
        prevBtn.classList.toggle('hidden', step === 1 || step === 4);
        nextBtn.classList.toggle('hidden', step === 3 || step === 4);
        submitBtn.classList.toggle('hidden', step !== 3);

        if (step === 3) {
            populateReviewDetails();
        }
    }

    // 3. Populate Review Step with form data
    function populateReviewDetails() {
        const reviewDetails = document.getElementById('review-details');
        
        const adMessage = adData.message || 'Not specified';
        const adType = adData.type || 'Not specified';
        const adPriority = adData.priority || 'Not specified';
        const contactName = adData.name || 'Not specified';
        const contactEmail = adData.email || 'Not specified';
        const contactPhone = adData.phone || 'Not specified';
        
        const packageHTML = `<p><strong>Package:</strong> ${adData.package}</p>`;
        const priceHTML = `<p><strong>Price:</strong> KSh ${new Intl.NumberFormat('en-KE').format(adData.price)}</p>`;
        const messageHTML = `<p><strong>Ad Message:</strong> ${adMessage}</p>`;
        const typeHTML = `<p><strong>Ad Type:</strong> ${adType}</p>`;
        const priorityHTML = `<p><strong>Ad Priority:</strong> ${adPriority}</p>`;
        const nameHTML = `<p><strong>Contact Name:</strong> ${contactName}</p>`;
        const emailHTML = `<p><strong>Contact Email:</strong> ${contactEmail}</p>`;
        const phoneHTML = `<p><strong>Contact Phone:</strong> ${contactPhone}</p>`;
        
        reviewDetails.innerHTML = packageHTML + priceHTML + messageHTML + typeHTML + priorityHTML + nameHTML + emailHTML + phoneHTML;
    }

    // 4. Button Handlers
    nextBtn.addEventListener('click', () => {
        // Simple validation for the current step before moving on
        const currentStepForm = document.getElementById(`step-${currentStep}`);
        const inputs = currentStepForm.querySelectorAll('input, select, textarea');
        let isValid = true;
        inputs.forEach(input => {
            if (!input.checkValidity()) {
                isValid = false;
                input.classList.add('is-invalid');
            } else {
                input.classList.remove('is-invalid');
                // Capture the value directly for the next step
                adData[input.name] = input.value;
            }
        });

        if (isValid) {
            if (currentStep < 4) {
                currentStep++;
                showStep(currentStep);
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        // This is where you would send data to a server.
        // For a front-end only site, we just log the data and show a success message.
        
        const finalAd = {
            id: Date.now(), // Generate a unique ID
            type: adData.type,
            message: adData.message,
            priority: adData.priority,
            package: adData.package,
            price: adData.price,
            contact: {
                name: adData.name,
                email: adData.email,
                phone: adData.phone
            }
        };

        console.log("Submitting ad data:", finalAd);
        // localStorage.setItem('ads.json', JSON.stringify(finalAd)); // Example of saving locally

        // Hide all steps and show success message
        stepContents.forEach(content => content.classList.add('hidden'));
        document.getElementById('success-message').classList.remove('hidden');
        prevBtn.classList.add('hidden');
        submitBtn.classList.add('hidden');
    });

    // 5. Payment Method Toggler (optional but good for UX)
    const paymentMethodSelect = document.getElementById('payment-method');
    const mpesaDetails = document.getElementById('mpesa-payment-details');

    if (paymentMethodSelect) {
      paymentMethodSelect.addEventListener('change', () => {
          if (paymentMethodSelect.value === 'mpesa') {
              mpesaDetails.style.display = 'flex';
          } else {
              mpesaDetails.style.display = 'none';
          }
      });
    }

    // Initial state
    showStep(currentStep);
});