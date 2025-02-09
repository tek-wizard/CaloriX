// assets/js/calorie.js

class CalorieCalculator {
    constructor() {
        this.form = document.getElementById('calorie-form');
        this.activityItems = document.querySelectorAll('.activity-item');
        this.intensityBtns = document.querySelectorAll('.intensity-btn');
        this.resultsSection = document.getElementById('results');
        this.historyContainer = document.getElementById('calculation-history');
        
        // MET values for different activities and intensities
        this.MET_VALUES = {
            running: { low: 7.0, moderate: 9.0, high: 12.0 },
            cycling: { low: 5.0, moderate: 7.0, high: 10.0 },
            swimming: { low: 6.0, moderate: 8.0, high: 10.0 },
            walking: { low: 3.0, moderate: 4.0, high: 5.0 },
            yoga: { low: 2.5, moderate: 3.5, high: 4.5 },
            weightlifting: { low: 3.0, moderate: 4.0, high: 6.0 }
        };

        // Food equivalents (calories per unit)
        this.FOOD_EQUIVALENTS = {
            pizza: 285, // calories per slice
            burger: 354, // calories per burger
            iceCream: 137, // calories per scoop
            chocolate: 546 // calories per 100g
        };

        this.selectedActivity = 'running';
        this.selectedIntensity = 'moderate';
        
        this.initializeEventListeners();
        this.loadHistory();
        this.setupRealTimeCalculation();
    }

    initializeEventListeners() {
        // Activity selection
        this.activityItems.forEach(item => {
            item.addEventListener('click', () => {
                this.updateActivitySelection(item);
            });
        });

        // Intensity selection
        this.intensityBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.updateIntensitySelection(btn);
            });
        });

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateAndDisplay();
        });

        // Slider value updates
        document.getElementById('weight').addEventListener('input', (e) => {
            document.getElementById('weight-value').textContent = `${e.target.value} kg`;
        });

        document.getElementById('duration').addEventListener('input', (e) => {
            document.getElementById('duration-value').textContent = `${e.target.value} min`;
        });

        // Save workout button
        document.getElementById('save-workout').addEventListener('click', () => {
            this.saveWorkout();
        });
    }

    updateActivitySelection(selectedItem) {
        this.activityItems.forEach(item => item.classList.remove('active'));
        selectedItem.classList.add('active');
        this.selectedActivity = selectedItem.dataset.activity;
        this.updateRealTimeCalculation();
    }

    updateIntensitySelection(selectedBtn) {
        this.intensityBtns.forEach(btn => btn.classList.remove('active'));
        selectedBtn.classList.add('active');
        this.selectedIntensity = selectedBtn.dataset.intensity;
        this.updateRealTimeCalculation();
    }

    setupRealTimeCalculation() {
        const inputs = ['weight', 'duration'];
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updateRealTimeCalculation();
            });
        });
    }

    updateRealTimeCalculation() {
        const weight = Number(document.getElementById('weight').value);
        const duration = Number(document.getElementById('duration').value);
        
        if (weight && duration) {
            const calories = this.calculateCalories(weight, duration);
            this.updateResults(calories, duration);
        }
    }

    calculateCalories(weight, duration) {
        const met = this.MET_VALUES[this.selectedActivity][this.selectedIntensity];
        const hours = duration / 60;
        return Math.round(met * weight * hours);
    }

    calculateAndDisplay() {
        const weight = Number(document.getElementById('weight').value);
        const duration = Number(document.getElementById('duration').value);
        
        const calories = this.calculateCalories(weight, duration);
        this.updateResults(calories, duration);
        this.addToHistory(calories, duration);
        
        // Show success notification
        showNotification('Calculation completed!');
    }

    updateResults(calories, duration) {
        this.resultsSection.classList.add('active');

        // Update calories number with animation
        const caloriesElement = document.querySelector('.calories-number');
        this.animateNumber(caloriesElement, calories);

        // Update additional info
        document.getElementById('time-to-burn').textContent = `${duration} minutes`;
        
        // Calculate food equivalent
        const pizzaSlices = (calories / this.FOOD_EQUIVALENTS.pizza).toFixed(1);
        document.getElementById('food-equivalent').textContent = `${pizzaSlices} slices of pizza`;
    }

    animateNumber(element, final, duration = 1000) {
        const start = Number(element.textContent);
        const step = (timestamp) => {
            if (!step.start) step.start = timestamp;
            const progress = timestamp - step.start;
            const percentage = Math.min(progress / duration, 1);
            
            const current = Math.round(start + (final - start) * percentage);
            element.textContent = current;

            if (percentage < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    addToHistory(calories, duration) {
        const historyItem = {
            activity: this.selectedActivity,
            intensity: this.selectedIntensity,
            calories,
            duration,
            timestamp: new Date().toISOString()
        };

        let history = this.getHistory();
        history.unshift(historyItem);
        history = history.slice(0, 10); // Keep only last 10 entries
        localStorage.setItem('calorieHistory', JSON.stringify(history));
        
        this.updateHistoryDisplay();
    }

    getHistory() {
        return JSON.parse(localStorage.getItem('calorieHistory')) || [];
    }

    loadHistory() {
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const history = this.getHistory();
        this.historyContainer.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-activity">
                    <i class="fas fa-${this.getActivityIcon(item.activity)}"></i>
                    ${item.activity.charAt(0).toUpperCase() + item.activity.slice(1)}
                </div>
                <div class="history-details">
                    <span>${item.calories} calories</span>
                    <span>${item.duration} min</span>
                    <span>${formatDate(new Date(item.timestamp))}</span>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(activity) {
        const icons = {
            running: 'running',
            cycling: 'bicycle',
            swimming: 'swimmer',
            walking: 'walking',
            yoga: 'pray',
            weightlifting: 'dumbbell'
        };
        return icons[activity] || 'fire';
    }

    saveWorkout() {
        const calories = Number(document.querySelector('.calories-number').textContent);
        const duration = Number(document.getElementById('duration').value);
        
        // Get existing workout data from localStorage
        const workouts = JSON.parse(localStorage.getItem('calorixData'))?.workouts || [];
        
        // Add new workout
        workouts.push({
            activity: this.selectedActivity,
            intensity: this.selectedIntensity,
            calories,
            duration,
            date: new Date().toISOString()
        });

        // Save back to localStorage
        const data = JSON.parse(localStorage.getItem('calorixData')) || {};
        data.workouts = workouts;
        localStorage.setItem('calorixData', JSON.stringify(data));

        showNotification('Workout saved to dashboard!');
    }
}

// Initialize calculator
const calculator = new CalorieCalculator();