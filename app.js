import { openDbConnection, getTodos, putTodo, deleteTodo } from "./db.js";

let actionTitleEl;
let todosParentEl;
let todoInputEl;
let todoInputButtonEl;
let todosSelectEl;
let editingTodo;
let status = "active";

window.addEventListener("DOMContentLoaded", () => {
  openDbConnection().then(() => {
    setupElements();
    setupTodoEvents();
    fetchTodos();
  });
});

function fetchTodos(status) {
  todosParentEl.innerText = "loading...";
  setTimeout(() => {
    getTodos(status).then((todos) => {
      todosParentEl.innerText = "";
      todos.forEach(createTodoItemElement);
    });
  }, 500);
}

function setupElements() {
  actionTitleEl = document.getElementById("action-title");
  todosParentEl = document.getElementById("todos");
  todoInputEl = document.getElementById("todo-input");
  todoInputButtonEl = document.getElementById("todo-input-button");
  todoInputButtonEl.onclick = addNewTodo;
  todosSelectEl = document.getElementById("todos-status");
  todosSelectEl.onchange = (e) => {
    status = e.target.value;
    fetchTodos(status);
  };
}

function setupTodoEvents() {
  todosParentEl.onclick = (e) => {
    switch (e.target.dataset.element) {
      case "todo-checkbox":
        toggleTodoItem(e.target);
        break;

      case "todo-edit-button":
        startEditingTodoTitle(e.target.parentElement);
        break;

      case "todo-delete-button":
        deleteTodoItem(getTodoCreatedDatetime(e.target));
        break;

      default:
        break;
    }
  };
}

function getTodoCreatedDatetime(target) {
  return Number(target.parentElement.dataset.todoItem);
}

function createTodoInnerHtml({ title, doneDatetime }) {
  const isDone = Boolean(doneDatetime);
  return `
    <input 
      type="checkbox" 
      data-element="todo-checkbox"
      ${isDone ? "checked" : ""}
    >
    <span class="todo-title">${title}</span>
    <button
      data-element="todo-edit-button"
    >edit</button>
    <button
      data-element="todo-delete-button"
    >delete</button>
  `;
}

function createTodoItemElement({ title, createdDatetime, doneDatetime }) {
  const todoItemEl = document.createElement("div");
  todoItemEl.dataset.todoItem = createdDatetime;
  todoItemEl.innerHTML = createTodoInnerHtml({ title, doneDatetime });

  todosParentEl.appendChild(todoItemEl);
}

function toggleTodoItem(target) {
  const createdDatetime = getTodoCreatedDatetime(target);
  const todo = {
    createdDatetime,
    doneDatetime: target.checked ? Date.now() : null,
  };

  putTodo(todo, false);

  setTimeout(() => {
    if (
      (status === "active" && todo.doneDatetime) ||
      (status === "done" && !todo.doneDatetime)
    ) {
      deleteTodoItemElement(createdDatetime);
    }
  }, 166);
}

function addNewTodo() {
  const title = todoInputEl.value.trim();
  if (!title.length) {
    return;
  }

  const newTodo = {
    title,
    createdDatetime: Date.now(),
  };

  putTodo(newTodo).then(() => {
    todoInputEl.value = "";
    createTodoItemElement(newTodo);
  });
}

function setAddingTodoMode() {
  actionTitleEl.innerText = "Add todo";
  todoInputEl.value = "";
  todoInputButtonEl.innerText = "Add";
  todoInputButtonEl.onclick = addNewTodo;
}

function setEditingTodoTitleMode(title) {
  actionTitleEl.innerText = "Edit todo";
  todoInputEl.value = title;
  todoInputButtonEl.innerText = "Save";
  todoInputButtonEl.onclick = saveEditedTodo;
}

function resetEditing() {
  editingTodo = null;
}

function resetInputValue() {
  todoInputEl.value = "";
}

function startEditingTodoTitle(todoEl) {
  editingTodo = {
    reason: "todoTitle",
    targetEl: todoEl,
    createdDatetime: Number(todoEl.dataset.todoItem),
  };
  const title = todoEl.querySelector(".todo-title").innerText;
  setEditingTodoTitleMode(title);
}

function saveEditedTodo() {
  const todo = {
    createdDatetime: editingTodo.createdDatetime,
  };

  if (editingTodo.reason === "todoTitle") {
    todo.title = todoInputEl.value;
  }

  putTodo(todo).then(() => {
    updateTodoItemElement(todo);

    if (editingTodo.reason === "todoTitle") {
      resetInputValue();
      setAddingTodoMode();
    }

    resetEditing();
  });
}

function updateTodoItemElement({ title }) {
  editingTodo.targetEl.innerHTML = createTodoInnerHtml({ title });
}

function deleteTodoItemElement(createdDatetime) {
  document.querySelector(`[data-todo-item="${createdDatetime}"]`).remove();
}

function deleteTodoItem(createdDatetime) {
  deleteTodo(createdDatetime).then(() =>
    deleteTodoItemElement(createdDatetime)
  );
}
