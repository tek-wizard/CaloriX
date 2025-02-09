// assets/js/exercise.js

class ExerciseLibrary {
    constructor() {
        this.RAPID_API_KEY = '3da7584e04msh4024b9a941db7e6p162b2ajsn6c60063f1fef';
        this.exercises = [];
        this.filteredExercises = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.selectedMuscle = '';
        this.selectedDifficulty = '';
        this.selectedEquipment = '';
        this.viewMode = 'grid';
        this.savedExercises = JSON.parse(localStorage.getItem('savedExercises')) || [];
        this.workoutPlan = JSON.parse(localStorage.getItem('workoutPlan')) || [];
        this.searchDebounceTimer = null;
        this.isFavoritesVisible = localStorage.getItem('favoritesVisible') === 'true';

        this.initializeElements();
        this.setupEventListeners();
        this.loadExercises();
        this.updateFavoritesSection();
    }

    initializeElements() {
        // Search elements
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        
        // Filter elements
        this.muscleItems = document.querySelectorAll('.muscle-item');
        this.difficultyBtns = document.querySelectorAll('.difficulty-btn');
        this.equipmentSelect = document.getElementById('equipment-filter');
        
        // Results elements
        this.exercisesGrid = document.getElementById('exercises-grid');
        this.loadingSpinner = document.querySelector('.loading-spinner');
        
        // Pagination elements
        this.prevPageBtn = document.getElementById('prev-page');
        this.nextPageBtn = document.getElementById('next-page');
        this.pageInfo = document.getElementById('page-info');
        
        // Modal elements
        this.modal = document.getElementById('exercise-modal');

        // Favorites elements
        this.favoritesSection = document.getElementById('favorites-section');
        this.favoritesContainer = document.getElementById('favorites-container');
        this.toggleFavoritesBtn = document.getElementById('toggle-favorites');

        // Initialize favorites visibility
        if (this.favoritesSection) {
            this.favoritesSection.classList.toggle('expanded', this.isFavoritesVisible);
        }
    }

    setupEventListeners() {
        // Search listeners with debouncing
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => this.handleSearch(), 300);
        });
        this.searchBtn.addEventListener('click', () => this.handleSearch());

        // Filter listeners
        this.muscleItems.forEach(item => {
            item.addEventListener('click', () => this.handleMuscleFilter(item));
        });

        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleDifficultyFilter(btn));
        });

        this.equipmentSelect.addEventListener('change', () => this.handleEquipmentFilter());

        // View toggle listeners
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.toggleView(btn.dataset.view));
        });

        // Pagination listeners
        this.prevPageBtn.addEventListener('click', () => this.changePage(-1));
        this.nextPageBtn.addEventListener('click', () => this.changePage(1));

        // Modal listeners
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Favorites toggle
        if (this.toggleFavoritesBtn) {
            this.toggleFavoritesBtn.addEventListener('click', () => this.toggleFavorites());
        }

        // Keyboard listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    async loadExercises() {
        this.showLoading(true);
        try {
            // Initially load local exercises
            this.exercises = initialExercises;
            this.filteredExercises = [...this.exercises];
            this.updateResults();
            showNotification('Exercises loaded successfully!');
        } catch (error) {
            console.error('Error loading exercises:', error);
            showNotification('Failed to load exercises', 'error');
            this.exercisesGrid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load exercises. Please try again later.</p>
                    <button onclick="exerciseLibrary.loadExercises()">Retry</button>
                </div>
            `;
        } finally {
            this.showLoading(false);
        }
    }

    handleSearch() {
        const searchTerm = this.searchInput.value.toLowerCase();
        this.currentPage = 1;
        this.filterExercises();
    }

    handleMuscleFilter(item) {
        this.muscleItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.selectedMuscle = item.dataset.muscle;
        this.currentPage = 1;
        this.filterExercises();
    }

    handleDifficultyFilter(btn) {
        this.difficultyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedDifficulty = btn.dataset.difficulty;
        this.currentPage = 1;
        this.filterExercises();
    }

    handleEquipmentFilter() {
        this.selectedEquipment = this.equipmentSelect.value;
        this.currentPage = 1;
        this.filterExercises();
    }

    filterExercises() {
        const searchTerm = this.searchInput.value.toLowerCase();
        
        this.filteredExercises = this.exercises.filter(exercise => {
            const matchesSearch = !searchTerm || 
                                exercise.name.toLowerCase().includes(searchTerm) ||
                                exercise.instructions.toLowerCase().includes(searchTerm);
            const matchesMuscle = !this.selectedMuscle || 
                                exercise.muscle === this.selectedMuscle;
            const matchesDifficulty = !this.selectedDifficulty || 
                                    exercise.difficulty === this.selectedDifficulty;
            const matchesEquipment = !this.selectedEquipment || 
                                   exercise.equipment === this.selectedEquipment;

            return matchesSearch && matchesMuscle && matchesDifficulty && matchesEquipment;
        });

        this.updateResults();
    }

    updateResults() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageExercises = this.filteredExercises.slice(startIndex, endIndex);

        if (this.filteredExercises.length === 0) {
            this.exercisesGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No exercises found matching your criteria</p>
                </div>
            `;
            this.updatePagination();
            return;
        }

        this.exercisesGrid.innerHTML = pageExercises.map(exercise => 
            this.createExerciseCard(exercise)).join('');
        this.updatePagination();

        // Add event listeners to cards
        document.querySelectorAll('.exercise-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.save-btn')) {
                    const exercise = this.exercises.find(ex => 
                        ex.name === card.dataset.exercise);
                    if (exercise) {
                        this.showExerciseDetails(exercise);
                    }
                }
            });

            const saveBtn = card.querySelector('.save-btn');
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const exerciseName = saveBtn.dataset.name;
                const exercise = this.exercises.find(ex => ex.name === exerciseName);
                this.toggleSaveExercise(exercise, saveBtn);
            });
        });
    }

    createExerciseCard(exercise) {
        const isSaved = this.savedExercises.some(saved => saved.name === exercise.name);
        const inWorkout = this.workoutPlan.some(ex => ex.name === exercise.name);
        
        return `
            <div class="exercise-card" data-exercise="${exercise.name}">
                <div class="exercise-image">
                    <i class="fas ${this.getExerciseIcon(exercise.muscle)}"></i>
                    <button class="save-btn ${isSaved ? 'saved' : ''}" 
                            data-name="${exercise.name}"
                            title="${isSaved ? 'Remove from saved' : 'Save exercise'}">
                        <i class="fa-heart ${isSaved ? 'fas' : 'far'}"></i>
                    </button>
                    ${inWorkout ? '<div class="workout-badge">In Workout</div>' : ''}
                </div>
                <div class="exercise-info">
                    <h3>${exercise.name}</h3>
                    <div class="exercise-tags">
                        <span class="tag">${exercise.muscle}</span>
                        <span class="tag">${exercise.difficulty}</span>
                        <span class="tag">${exercise.equipment}</span>
                    </div>
                    <p>${exercise.instructions.slice(0, 100)}...</p>
                </div>
            </div>
        `;
    }

    showExerciseDetails(exercise) {
        document.body.style.overflow = 'hidden';
        const isSaved = this.savedExercises.some(saved => saved.name === exercise.name);
        const inWorkout = this.workoutPlan.some(ex => ex.name === exercise.name);
        
        const modalBody = this.modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="exercise-detail">
                <div class="exercise-image">
                    <i class="fas ${this.getExerciseIcon(exercise.muscle)} fa-3x"></i>
                </div>
                <div class="exercise-header">
                    <h2>${exercise.name}</h2>
                    <button class="save-btn ${isSaved ? 'saved' : ''}" 
                            data-name="${exercise.name}"
                            title="${isSaved ? 'Remove from saved' : 'Save exercise'}">
                        <i class="fa-heart ${isSaved ? 'fas' : 'far'}"></i>
                    </button>
                </div>
                <div class="exercise-tags">
                    <span class="tag">${exercise.muscle}</span>
                    <span class="tag">${exercise.difficulty}</span>
                    <span class="tag">${exercise.equipment}</span>
                </div>
                <div class="exercise-instructions">
                    <h3>Instructions</h3>
                    <p>${exercise.instructions}</p>
                </div>
            </div>
        `;

        // Update modal footer
        const modalFooter = this.modal.querySelector('.modal-footer');
        modalFooter.innerHTML = `
            <button class="add-to-workout ${inWorkout ? 'in-workout' : ''}" 
                    data-name="${exercise.name}">
                <i class="fas ${inWorkout ? 'fa-check' : 'fa-plus'}"></i>
                ${inWorkout ? 'In Workout' : 'Add to Workout'}
            </button>
        `;

        this.modal.classList.add('active');

        // Add event listeners
        const saveBtn = modalBody.querySelector('.save-btn');
        saveBtn.addEventListener('click', () => {
            this.toggleSaveExercise(exercise, saveBtn);
            // Update the card's save button as well
            const card = this.exercisesGrid.querySelector(`[data-exercise="${exercise.name}"]`);
            if (card) {
                const cardSaveBtn = card.querySelector('.save-btn');
                cardSaveBtn.className = saveBtn.className;
                cardSaveBtn.querySelector('i').className = saveBtn.querySelector('i').className;
            }
        });

        const workoutBtn = modalFooter.querySelector('.add-to-workout');
        workoutBtn.addEventListener('click', () => {
            this.toggleWorkoutPlan(exercise, workoutBtn);
        });
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    toggleSaveExercise(exercise, button) {
        const index = this.savedExercises.findIndex(saved => saved.name === exercise.name);
        const heartIcon = button.querySelector('i');
        
        if (index === -1) {
            this.savedExercises.push(exercise);
            button.classList.add('saved');
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas');
            showNotification('Exercise saved to favorites!');
        } else {
            this.savedExercises.splice(index, 1);
            button.classList.remove('saved');
            heartIcon.classList.remove('fas');
            heartIcon.classList.add('far');
            showNotification('Exercise removed from favorites');
        }

        localStorage.setItem('savedExercises', JSON.stringify(this.savedExercises));
        this.updateFavoritesSection();
    }

    toggleWorkoutPlan(exercise, button) {
        const index = this.workoutPlan.findIndex(ex => ex.name === exercise.name);
        
        if (index === -1) {
            this.workoutPlan.push(exercise);
            button.classList.add('in-workout');
            button.innerHTML = '<i class="fas fa-check"></i> In Workout';
            showNotification('Added to workout plan!');
        } else {
            this.workoutPlan.splice(index, 1);
            button.classList.remove('in-workout');
            button.innerHTML = '<i class="fas fa-plus"></i> Add to Workout';
            showNotification('Removed from workout plan');
        }

        localStorage.setItem('workoutPlan', JSON.stringify(this.workoutPlan));
        this.updateResults(); // Refresh cards to update workout badges
    }

    updateFavoritesSection() {
        if (!this.favoritesContainer) return;

        if (this.savedExercises.length === 0) {
            this.favoritesContainer.innerHTML = `
                <div class="no-favorites">
                    <i class="far fa-heart"></i>
                    <p>No saved exercises yet</p>
                </div>
            `;
            return;
        }

        this.favoritesContainer.innerHTML = this.savedExercises.map(exercise => `
            <div class="favorite-item">
                <div class="favorite-info">
                    <h4>${exercise.name}</h4>
                    <div class="favorite-tags">
                        <span class="tag">${exercise.muscle}</span>
                        <span class="tag">${exercise.difficulty}</span>
                    </div>
                </div>
                <div class="favorite-actions">
                    <button class="view-btn" data-name="${exercise.name}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="remove-btn" data-name="${exercise.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to favorite items
        this.favoritesContainer.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const exercise = this.savedExercises.find(ex => ex.name === btn.dataset.name);
                if (exercise) this.showExerciseDetails(exercise);
            });
        });

        this.favoritesContainer.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const exercise = this.savedExercises.find(ex => ex.name === btn.dataset.name);
                if (exercise) {
                    const card = this.exercisesGrid.querySelector(`[data-exercise="${exercise.name}"]`);
                    if (card) {
                        const saveBtn = card.querySelector('.save-btn');
                        this.toggleSaveExercise(exercise, saveBtn);
                    } else {
                        this.savedExercises = this.savedExercises.filter(ex => ex.name !== exercise.name);
                        localStorage.setItem('savedExercises', JSON.stringify(this.savedExercises));
                        this.updateFavoritesSection();
                        showNotification('Exercise removed from favorites');
                    }
                }
            });
        });
    }

    toggleFavorites() {
        this.isFavoritesVisible = !this.isFavoritesVisible;
        this.favoritesSection.classList.toggle('expanded', this.isFavoritesVisible);
        this.toggleFavoritesBtn.querySelector('i').className = 
            this.isFavoritesVisible ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        localStorage.setItem('favoritesVisible', this.isFavoritesVisible);
    }

    getExerciseIcon(muscle) {
        const icons = {
            chest: 'fa-child',
            back: 'fa-child fa-flip-horizontal',
            arms: 'fa-dumbbell',
            legs: 'fa-walking',
            shoulders: 'fa-child',
            abs: 'fa-child'
        };
        return icons[muscle] || 'fa-dumbbell';
    }

    toggleView(view) {
        this.viewMode = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        this.exercisesGrid.className = view === 'grid' ? 'exercises-grid' : 'exercises-list';
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredExercises.length / this.itemsPerPage);
        this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        
        this.prevPageBtn.disabled = this.currentPage === 1;
        this.nextPageBtn.disabled = this.currentPage === totalPages;
    }

    changePage(delta) {
        this.currentPage += delta;
        this.updateResults();
    }

    showLoading(show) {
        this.loadingSpinner.classList.toggle('active', show);
    }
}

// Initialize library
const exerciseLibrary = new ExerciseLibrary();