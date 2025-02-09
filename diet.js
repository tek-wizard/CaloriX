// assets/js/diet.js

class DietPlanner {
    constructor() {
        this.meals = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snacks: []
        };
        this.goals = {
            calories: 2000,
            protein: 50,
            carbs: 250,
            fat: 65
        };
        this.waterIntake = 0;
        this.selectedDate = new Date();
        this.currentMeal = null;

        // Load saved data
        this.loadData();
        
        // Initialize elements
        this.initializeElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI
        this.updateUI();
    }

    initializeElements() {
        // Date elements
        this.dateDisplay = document.getElementById('selected-date');
        this.prevDateBtn = document.querySelector('.date-nav.prev');
        this.nextDateBtn = document.querySelector('.date-nav.next');

        // Meal sections
        this.mealSections = document.querySelectorAll('.meal-section');
        
        // Modals
        this.addFoodModal = document.getElementById('add-food-modal');
        this.editGoalsModal = document.getElementById('edit-goals-modal');
        
        // Forms
        this.quickAddForm = document.getElementById('quick-add-form');
        this.goalsForm = document.getElementById('goals-form');
        
        // Water tracker
        this.waterAmount = document.getElementById('water-amount');
        this.waterLevel = document.querySelector('.water-level');
        this.addWaterBtn = document.querySelector('.add-water-btn');
    }

    setupEventListeners() {
        // Date navigation
        this.prevDateBtn.addEventListener('click', () => this.changeDate(-1));
        this.nextDateBtn.addEventListener('click', () => this.changeDate(1));

        // Add food buttons
        document.querySelectorAll('.add-food-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mealSection = e.target.closest('.meal-section');
                this.currentMeal = mealSection.dataset.meal;
                this.showAddFoodModal();
            });
        });

        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Quick add form
        this.quickAddForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleQuickAdd();
        });

        // Goals form
        this.goalsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGoalsUpdate();
        });

        // Edit goals button
        document.querySelector('.edit-goals-btn').addEventListener('click', () => {
            this.showEditGoalsModal();
        });

        // Water tracker
        this.addWaterBtn.addEventListener('click', () => this.addWater());

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });

        // Food search
        const searchInput = this.addFoodModal.querySelector('input[type="text"]');
        searchInput.addEventListener('input', debounce(() => {
            this.searchFood(searchInput.value);
        }, 300));
    }

    loadData() {
        const date = this.formatDate(this.selectedDate);
        const savedData = localStorage.getItem(`diet_${date}`);
        if (savedData) {
            const data = JSON.parse(savedData);
            this.meals = data.meals;
            this.waterIntake = data.waterIntake;
        }

        const savedGoals = localStorage.getItem('dietGoals');
        if (savedGoals) {
            this.goals = JSON.parse(savedGoals);
        }
    }

    saveData() {
        const date = this.formatDate(this.selectedDate);
        const data = {
            meals: this.meals,
            waterIntake: this.waterIntake
        };
        localStorage.setItem(`diet_${date}`, JSON.stringify(data));
        localStorage.setItem('dietGoals', JSON.stringify(this.goals));
    }

    updateUI() {
        // Update date display
        this.updateDateDisplay();
        
        // Update meals
        this.updateMeals();
        
        // Update nutrition summary
        this.updateNutritionSummary();
        
        // Update water tracker
        this.updateWaterTracker();
    }

    updateDateDisplay() {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        this.dateDisplay.textContent = this.selectedDate.toLocaleDateString('en-US', options);
    }

    updateMeals() {
        Object.entries(this.meals).forEach(([mealType, foods]) => {
            const mealSection = document.querySelector(`.meal-section[data-meal="${mealType}"]`);
            const mealItems = mealSection.querySelector('.meal-items');
            const caloriesDisplay = mealSection.querySelector('.meal-calories');

            // Clear existing items
            mealItems.innerHTML = '';

            // Add food items
            foods.forEach((food, index) => {
                const foodItem = document.createElement('div');
                foodItem.className = 'food-item';
                foodItem.innerHTML = `
                    <div class="food-info">
                        <span class="food-name">${food.name}</span>
                        <span class="food-calories">${food.calories} cal</span>
                    </div>
                    <div class="food-macros">
                        <span>P: ${food.protein}g</span>
                        <span>C: ${food.carbs}g</span>
                        <span>F: ${food.fat}g</span>
                    </div>
                    <button class="remove-food" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                // Add remove event listener
                foodItem.querySelector('.remove-food').addEventListener('click', () => {
                    this.removeFood(mealType, index);
                });

                mealItems.appendChild(foodItem);
            });

            // Update meal calories
            const totalCalories = foods.reduce((sum, food) => sum + food.calories, 0);
            caloriesDisplay.textContent = `${totalCalories} cal`;
        });
    }

    updateNutritionSummary() {
        // Calculate totals
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        Object.values(this.meals).forEach(foods => {
            foods.forEach(food => {
                totalCalories += food.calories;
                totalProtein += food.protein;
                totalCarbs += food.carbs;
                totalFat += food.fat;
            });
        });

        // Update progress circle
        const percentage = Math.min(Math.round((totalCalories / this.goals.calories) * 100), 100);
        const progressCircle = document.querySelector('.progress-circle .progress');
        const percentageDisplay = document.querySelector('.percentage .number');
        const remainingDisplay = document.querySelector('.calories-remaining h4');

        progressCircle.style.strokeDashoffset = 220 - (220 * percentage) / 100;
        percentageDisplay.textContent = percentage;
        remainingDisplay.textContent = Math.max(this.goals.calories - totalCalories, 0);

        // Update macro bars
        this.updateMacroBar('protein', totalProtein, this.goals.protein);
        this.updateMacroBar('carbs', totalCarbs, this.goals.carbs);
        this.updateMacroBar('fat', totalFat, this.goals.fat);
    }

    updateMacroBar(macro, current, goal) {
        const percentage = Math.min(Math.round((current / goal) * 100), 100);
        const bar = document.querySelector(`.macro-bar .fill.${macro}`);
        const label = bar.closest('.macro-bar').querySelector('.bar-label span:last-child');
        
        bar.style.width = `${percentage}%`;
        label.textContent = `${current}/${goal}g`;
    }

    updateWaterTracker() {
        const percentage = (this.waterIntake / 8) * 100;
        this.waterLevel.style.height = `${percentage}%`;
        this.waterAmount.textContent = this.waterIntake;
    }

    showAddFoodModal() {
        this.addFoodModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.addFoodModal.querySelector('input[type="text"]').focus();
    }

    showEditGoalsModal() {
        // Populate current goals
        document.getElementById('calories-goal').value = this.goals.calories;
        document.getElementById('protein-goal').value = this.goals.protein;
        document.getElementById('carbs-goal').value = this.goals.carbs;
        document.getElementById('fat-goal').value = this.goals.fat;

        this.editGoalsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModals() {
        this.addFoodModal.classList.remove('active');
        this.editGoalsModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    handleQuickAdd() {
        const form = this.quickAddForm;
        const food = {
            name: form.querySelector('input[type="text"]').value,
            calories: parseInt(form.querySelectorAll('input[type="number"]')[0].value),
            protein: parseInt(form.querySelectorAll('input[type="number"]')[1].value) || 0,
            carbs: parseInt(form.querySelectorAll('input[type="number"]')[2].value) || 0,
            fat: parseInt(form.querySelectorAll('input[type="number"]')[3].value) || 0
        };

        this.addFood(this.currentMeal, food);
        form.reset();
        this.closeModals();
        showNotification('Food added successfully!');
    }

    handleGoalsUpdate() {
        this.goals = {
            calories: parseInt(document.getElementById('calories-goal').value),
            protein: parseInt(document.getElementById('protein-goal').value),
            carbs: parseInt(document.getElementById('carbs-goal').value),
            fat: parseInt(document.getElementById('fat-goal').value)
        };

        this.saveData();
        this.updateUI();
        this.closeModals();
        showNotification('Goals updated successfully!');
    }

    addFood(mealType, food) {
        this.meals[mealType].push(food);
        this.saveData();
        this.updateUI();
    }

    removeFood(mealType, index) {
        this.meals[mealType].splice(index, 1);
        this.saveData();
        this.updateUI();
        showNotification('Food removed');
    }

    addWater() {
        if (this.waterIntake < 8) {
            this.waterIntake++;
            this.saveData();
            this.updateWaterTracker();
            showNotification('Water intake updated!');
        }
    }

    changeDate(delta) {
        this.selectedDate.setDate(this.selectedDate.getDate() + delta);
        this.loadData();
        this.updateUI();
    }

    async searchFood(query) {
        if (!query) return;

        const resultsContainer = this.addFoodModal.querySelector('.food-results');
        resultsContainer.innerHTML = '<div class="loading">Searching...</div>';

        try {
            // Here you would typically make an API call to a food database
            // For now, we'll use some dummy data
            const results = await this.getDummyFoodResults(query);
            
            resultsContainer.innerHTML = results.map(food => `
                <div class="food-result" data-food='${JSON.stringify(food)}'>
                    <div class="food-result-info">
                        <span class="food-result-name">${food.name}</span>
                        <span class="food-result-calories">${food.calories} cal</span>
                    </div>
                    <div class="food-result-macros">
                        <span>P: ${food.protein}g</span>
                        <span>C: ${food.carbs}g</span>
                        <span>F: ${food.fat}g</span>
                    </div>
                </div>
            `).join('');

            // Add click listeners to results
            resultsContainer.querySelectorAll('.food-result').forEach(result => {
                result.addEventListener('click', () => {
                    const food = JSON.parse(result.dataset.food);
                    this.addFood(this.currentMeal, food);
                    this.closeModals();
                    showNotification('Food added successfully!');
                });
            });

        } catch (error) {
            resultsContainer.innerHTML = '<div class="error">Error searching for food</div>';
        }
    }

    getDummyFoodResults(query) {
        // Simulate API delay
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
                    { name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fat: 1.8 },
                    { name: 'Salmon', calories: 208, protein: 22, carbs: 0, fat: 13 },
                    { name: 'Sweet Potato', calories: 103, protein: 2, carbs: 24, fat: 0 }
                ].filter(food => food.name.toLowerCase().includes(query.toLowerCase())));
            }, 500);
        });
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}

// Helper function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize diet planner
const dietPlanner = new DietPlanner();