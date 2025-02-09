// assets/js/dashboard.js

class WeeklyGoal {
    constructor(initialGoal = 2000) {
        this.goal = parseInt(localStorage.getItem('weeklyGoal')) || initialGoal;
        this.weekStart = this.getWeekStart();
        this.weekEnd = this.getWeekEnd();
    }

    getWeekStart() {
        const date = new Date();
        date.setDate(date.getDate() - date.getDay());
        date.setHours(0, 0, 0, 0);
        return date;
    }

    getWeekEnd() {
        const date = new Date();
        date.setDate(date.getDate() + (6 - date.getDay()));
        date.setHours(23, 59, 59, 999);
        return date;
    }

    calculateProgress(workouts) {
        const weeklyCalories = workouts
            .filter(workout => {
                const workoutDate = new Date(workout.date);
                return workoutDate >= this.weekStart && workoutDate <= this.weekEnd;
            })
            .reduce((sum, workout) => sum + workout.calories, 0);

        return {
            current: weeklyCalories,
            goal: this.goal,
            percentage: Math.min(Math.round((weeklyCalories / this.goal) * 100), 100),
            remaining: Math.max(this.goal - weeklyCalories, 0),
            daysLeft: 6 - new Date().getDay()
        };
    }

    updateGoal(newGoal) {
        this.goal = newGoal;
        localStorage.setItem('weeklyGoal', newGoal);
    }

    getRecommendedDaily(progress) {
        if (progress.daysLeft === 0) return 0;
        return Math.round(progress.remaining / progress.daysLeft);
    }
}

class Dashboard {
    constructor() {
        this.calorieChart = null;
        this.todoList = document.getElementById('todo-list');
        this.weeklyGoal = new WeeklyGoal();
        this.initializeData();
        this.setupEventListeners();
        this.updateDashboard();
    }

    initializeData() {
        this.data = JSON.parse(localStorage.getItem('calorixData')) || {
            workouts: [],
            todos: []
        };
        
        if (!localStorage.getItem('calorixData')) {
            this.saveData();
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.graph-controls button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelector('.graph-controls button.active')
                    .classList.remove('active');
                button.classList.add('active');
                this.updateGraph(button.dataset.period);
            });
        });

        document.getElementById('add-todo').addEventListener('click', () => {
            this.showAddTodoModal();
        });
    }

    updateDashboard() {
        this.updatePerformanceCards();
        this.updateGraph('week');
        this.updateTodoList();
    }

    updatePerformanceCards() {
        const today = new Date().toDateString();
        
        // Get today's workouts
        const todayWorkouts = this.data.workouts
            .filter(workout => new Date(workout.date).toDateString() === today);
        
        const todayCalories = todayWorkouts.reduce((sum, workout) => sum + workout.calories, 0);
        const workoutCount = todayWorkouts.length;

        // Update Calories Card
        const caloriesCard = document.querySelector('.card:nth-child(1)');
        caloriesCard.innerHTML = `
            <i class="fas fa-fire-flame-curved"></i>
            <h3>Today's Calories</h3>
            <div class="calories-display">
                <span class="number">${formatNumber(todayCalories)}</span>
                <span class="unit">calories</span>
            </div>
            <div class="card-details">
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>Last activity: ${this.getLastActivityTime(todayWorkouts)}</span>
                </div>
                <button class="view-details-btn" data-type="calories">
                    <i class="fas fa-chart-bar"></i>
                    View Details
                </button>
            </div>
        `;

        // Update Workouts Card
        const workoutsCard = document.querySelector('.card:nth-child(2)');
        workoutsCard.innerHTML = `
            <i class="fas fa-dumbbell"></i>
            <h3>Workouts Done</h3>
            <div class="workouts-display">
                <span class="number">${workoutCount}</span>
                <span class="unit">today</span>
            </div>
            <div class="card-details">
                <div class="detail-item">
                    <i class="fas fa-trophy"></i>
                    <span>${this.getWorkoutStreak()} day streak</span>
                </div>
                <button class="view-details-btn" data-type="workouts">
                    <i class="fas fa-list"></i>
                    View Details
                </button>
            </div>
        `;

        // Update Weekly Goal Card
        const progress = this.weeklyGoal.calculateProgress(this.data.workouts);
        const weeklyGoalCard = document.querySelector('.card:nth-child(3)');
        weeklyGoalCard.innerHTML = `
            <i class="fas fa-trophy"></i>
            <h3>Weekly Goal</h3>
            <div class="goal-progress">
                <div class="progress-bar">
                    <div class="progress-bar-fill" 
                         style="--progress: ${progress.percentage}%"></div>
                </div>
                <p class="progress-text">${progress.percentage}%</p>
            </div>
            <div class="goal-details">
                <p>${formatNumber(progress.current)} / ${formatNumber(progress.goal)} calories</p>
                <p>${formatNumber(progress.remaining)} calories remaining</p>
                ${progress.daysLeft > 0 ? 
                    `<p>Recommended daily: ${formatNumber(this.weeklyGoal.getRecommendedDaily(progress))} calories</p>` : 
                    '<p>Week complete!</p>'}
            </div>
            <button class="edit-goal-btn">
                <i class="fas fa-edit"></i> Edit Goal
            </button>
        `;

        // Add event listeners
        caloriesCard.querySelector('.view-details-btn').addEventListener('click', () => {
            this.showDetailsModal('calories', todayWorkouts);
        });

        workoutsCard.querySelector('.view-details-btn').addEventListener('click', () => {
            this.showDetailsModal('workouts', todayWorkouts);
        });

        weeklyGoalCard.querySelector('.edit-goal-btn').addEventListener('click', () => {
            this.showEditGoalModal();
        });
    }

    getLastActivityTime(todayWorkouts) {
        if (todayWorkouts.length === 0) return 'No activity today';
        
        const lastWorkout = todayWorkouts[todayWorkouts.length - 1];
        const lastTime = new Date(lastWorkout.date);
        return lastTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }

    getWorkoutStreak() {
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            
            const hasWorkout = this.data.workouts.some(workout => {
                const workoutDate = new Date(workout.date);
                return workoutDate.toDateString() === checkDate.toDateString();
            });

            if (hasWorkout) {
                streak++;
            } else if (i !== 0) {
                break;
            }
        }
        return streak;
    }

    showDetailsModal(type, todayWorkouts) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const content = type === 'calories' 
            ? this.getCaloriesModalContent(todayWorkouts)
            : this.getWorkoutsModalContent(todayWorkouts);

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${type === 'calories' ? "Today's Calories" : "Today's Workouts"}</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');

        const closeModal = () => modal.remove();
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    getCaloriesModalContent(todayWorkouts) {
        if (todayWorkouts.length === 0) {
            return '<p class="no-data">No workouts recorded today</p>';
        }

        const workoutsByType = todayWorkouts.reduce((acc, workout) => {
            acc[workout.activity] = (acc[workout.activity] || 0) + workout.calories;
            return acc;
        }, {});

        return `
            <div class="calories-breakdown">
                ${Object.entries(workoutsByType).map(([activity, calories]) => `
                    <div class="breakdown-item">
                        <div class="activity-info">
                            <i class="fas fa-${this.getActivityIcon(activity)}"></i>
                            <span>${activity.charAt(0).toUpperCase() + activity.slice(1)}</span>
                        </div>
                        <span class="calories-value">${formatNumber(calories)} cal</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getWorkoutsModalContent(todayWorkouts) {
        if (todayWorkouts.length === 0) {
            return '<p class="no-data">No workouts recorded today</p>';
        }

        return `
            <div class="workouts-list">
                ${todayWorkouts.map(workout => `
                    <div class="workout-item">
                        <div class="workout-info">
                            <i class="fas fa-${this.getActivityIcon(workout.activity)}"></i>
                            <div class="workout-details">
                                <span class="workout-activity">
                                    ${workout.activity.charAt(0).toUpperCase() + workout.activity.slice(1)}
                                </span>
                                <span class="workout-time">
                                    ${new Date(workout.date).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </span>
                            </div>
                        </div>
                        <span class="workout-calories">${formatNumber(workout.calories)} cal</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    showEditGoalModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Weekly Goal</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="goal-input">
                        <label>Weekly Calorie Goal</label>
                        <input type="number" 
                               value="${this.weeklyGoal.goal}" 
                               min="500" 
                               max="10000" 
                               step="100">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn">Cancel</button>
                    <button class="save-btn">Save Goal</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');

        const closeModal = () => modal.remove();
        
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-btn').addEventListener('click', closeModal);

        modal.querySelector('.save-btn').addEventListener('click', () => {
            const newGoal = Number(modal.querySelector('input').value);
            this.weeklyGoal.updateGoal(newGoal);
            closeModal();
            this.updateDashboard();
            showNotification('Weekly goal updated successfully!');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    updateGraph(period) {
        const ctx = document.getElementById('calorieChart').getContext('2d');
        const dates = this.getDateRange(period);
        const calorieData = this.getCalorieData(dates);

        if (this.calorieChart) {
            this.calorieChart.destroy();
        }

        this.calorieChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates.map(date => formatDate(date)),
                datasets: [{
                    label: 'Calories Burned',
                    data: calorieData,
                    borderColor: '#1a73e8',
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    getDateRange(period) {
        const dates = [];
        const today = new Date();
        const count = period === 'week' ? 7 : 30;

        for (let i = count - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            dates.push(date);
        }

        return dates;
    }

    getCalorieData(dates) {
        return dates.map(date => {
            const dayStr = date.toDateString();
            return this.data.workouts
                .filter(workout => new Date(workout.date).toDateString() === dayStr)
                .reduce((sum, workout) => sum + workout.calories, 0);
        });
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

    

    updateTodoList() {
        this.todoList.innerHTML = '';
        
        if (this.data.todos.length === 0) {
            this.todoList.innerHTML = `
                <div class="empty-todo">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No workouts planned for today</p>
                </div>
            `;
            return;
        }
    
        // First, add a separator for completed tasks if there are any
        const hasPendingTasks = this.data.todos.some(todo => !todo.completed);
        const hasCompletedTasks = this.data.todos.some(todo => todo.completed);
    
        // Sort: incomplete first, then completed, both sorted by date
        const sortedTodos = this.data.todos.map((todo, index) => ({
            ...todo,
            originalIndex: index
        })).sort((a, b) => {
            if (a.completed === b.completed) {
                return new Date(b.date) - new Date(a.date);
            }
            return a.completed ? 1 : -1;
        });
    
        sortedTodos.forEach((todo, displayIndex) => {
            // Add separator before first completed task
            if (hasPendingTasks && hasCompletedTasks && 
                displayIndex > 0 && 
                !sortedTodos[displayIndex - 1].completed && 
                todo.completed) {
                const separator = document.createElement('div');
                separator.className = 'todo-separator';
                separator.innerHTML = '<span>Completed Workouts</span>';
                this.todoList.appendChild(separator);
            }
    
            const todoItem = document.createElement('div');
            todoItem.className = `todo-item ${todo.completed ? 'completed' : 'pending'}`;
            todoItem.innerHTML = `
                <div class="todo-content">
                    <label class="checkbox-container">
                        <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                    <span class="todo-text">${todo.text}</span>
                    <span class="todo-time">${formatTime(new Date(todo.date))}</span>
                </div>
                <div class="todo-actions">
                    <button class="edit-todo" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-todo" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
    
            // Add animation class if it's being toggled
            if (todo.isToggling) {
                todoItem.classList.add('animating');
                delete todo.isToggling;
            }
    
            // Event Listeners
            const checkbox = todoItem.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                todoItem.classList.add('animating');
                this.toggleTodo(todo.originalIndex, e.target.checked);
            });
    
            todoItem.querySelector('.edit-todo').addEventListener('click', () => {
                this.editTodo(todo.originalIndex);
            });
    
            todoItem.querySelector('.delete-todo').addEventListener('click', () => {
                this.confirmDeleteTodo(todo.originalIndex);
            });
    
            this.todoList.appendChild(todoItem);
        });
    }

    showModal(modalContent) {
        // Disable scrolling when modal opens
        document.body.style.overflow = 'hidden';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = modalContent;
    
        document.body.appendChild(modal);
        modal.classList.add('active');
    
        const closeModal = () => {
            modal.classList.remove('active');
            // Re-enable scrolling when modal closes
            document.body.style.overflow = '';
            setTimeout(() => modal.remove(), 300);
        };
    
        // Close modal listeners
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-btn')?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    
        return { modal, closeModal };
    }

    showDetailsModal(type, todayWorkouts) {
        // Prevent scrolling when modal opens
        document.body.style.overflow = 'hidden';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const content = type === 'calories' 
            ? this.getCaloriesModalContent(todayWorkouts)
            : this.getWorkoutsModalContent(todayWorkouts);
    
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${type === 'calories' ? "Today's Calories" : "Today's Workouts"}</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
        modal.classList.add('active');
    
        const closeModal = () => {
            modal.classList.remove('active');
            // Re-enable scrolling when modal closes
            document.body.style.overflow = '';
            setTimeout(() => modal.remove(), 300);
        };
    
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    
    
    toggleTodo(originalIndex, completed) {
        if (originalIndex >= 0 && originalIndex < this.data.todos.length) {
            // Mark the todo as toggling for animation
            this.data.todos[originalIndex].isToggling = true;
            this.data.todos[originalIndex].completed = completed;
            
            // Save to localStorage
            this.saveData();
            
            // Update UI with slight delay for animation
            setTimeout(() => {
                this.updateTodoList();
            }, 300); // Match this with CSS animation duration
            
            showNotification(completed ? 'Workout completed!' : 'Workout uncompleted');
        }
    }
    


    editTodo(index) {
        const todo = this.data.todos[index];
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Workout</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <input type="text" 
                           class="todo-input" 
                           value="${todo.text}"
                           maxlength="50">
                    <div class="input-counter">${todo.text.length}/50</div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn">Cancel</button>
                    <button class="save-btn">Save Changes</button>
                </div>
            </div>
        `;
    
        const { modal, closeModal } = this.showModal(modalContent);
    
        const input = modal.querySelector('.todo-input');
        const saveBtn = modal.querySelector('.save-btn');
        const counter = modal.querySelector('.input-counter');
    
        input.focus();
        input.setSelectionRange(0, input.value.length);
    
        input.addEventListener('input', () => {
            const length = input.value.trim().length;
            counter.textContent = `${length}/50`;
            saveBtn.disabled = length === 0;
        });
    
        saveBtn.addEventListener('click', () => {
            const newText = input.value.trim();
            if (newText && newText !== todo.text) {
                this.data.todos[index].text = newText;
                this.data.todos[index].lastEdited = new Date().toISOString();
                this.saveData();
                this.updateTodoList();
                showNotification('Workout updated successfully!');
            }
            closeModal();
        });
    }
    
    confirmDeleteTodo(index) {
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Confirm Delete</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this workout?</p>
                    <p class="text-secondary">${this.data.todos[index].text}</p>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn">Cancel</button>
                    <button class="delete-btn">Delete</button>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
        modal.classList.add('active');
    
        const closeModal = () => {
            modal.classList.remove('active');
            document.body.style.overflow = ''; // Re-enable scrolling
            setTimeout(() => modal.remove(), 300);
        };
    
        // Event Listeners
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
        
        // Delete button event listener
        modal.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteTodo(index);
            closeModal();
        });
    
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    deleteTodo(index) {
        if (index >= 0 && index < this.data.todos.length) {
            this.data.todos.splice(index, 1);
            this.saveData();
            this.updateTodoList();
            showNotification('Workout removed successfully');
        }
    }

    saveData() {
        localStorage.setItem('calorixData', JSON.stringify(this.data));
    }

    showAddTodoModal() {
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Workout</h3>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <input type="text" 
                           class="todo-input" 
                           placeholder="Enter workout description"
                           maxlength="50">
                    <div class="input-counter">0/50</div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn">Cancel</button>
                    <button class="save-btn" disabled>Add Workout</button>
                </div>
            </div>
        `;
    
        const { modal, closeModal } = this.showModal(modalContent);
    
        const input = modal.querySelector('.todo-input');
        const saveBtn = modal.querySelector('.save-btn');
        const counter = modal.querySelector('.input-counter');
    
        input.addEventListener('input', () => {
            const length = input.value.trim().length;
            counter.textContent = `${length}/50`;
            saveBtn.disabled = length === 0;
        });
    
        saveBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (text) {
                this.addTodo(text);
                closeModal();
            }
        });
    
        // Focus input
        setTimeout(() => input.focus(), 100);
    }
    
    addTodo(text) {
        this.data.todos.push({
            text,
            completed: false,
            date: new Date().toISOString()
        });
        this.saveData();
        this.updateTodoList();
        showNotification('Workout added successfully!');
    }
}

// Initialize dashboard
const dashboard = new Dashboard();

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}