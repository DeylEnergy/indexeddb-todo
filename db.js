const TODOS_STORE = "todos";
const CURRENT_VERSION = 1;

let todosDb;

function promisifyRequest(request) {
  return new Promise((resolve) => {
    request.onsuccess = (e) => resolve([e.target.result, null]);
    request.onerror = (e) => resolve([null, e.target.errorCode]);
  });
}

export function openDbConnection() {
  return new Promise((resolve, reject) => {
    let dbReq = indexedDB.open("todosDb", CURRENT_VERSION);

    dbReq.onupgradeneeded = function (event) {
      todosDb = event.target.result;

      if (!todosDb.objectStoreNames.contains(TODOS_STORE)) {
        const todosStore = todosDb.createObjectStore(TODOS_STORE, {
          keyPath: "createdDatetime",
        });
        todosStore.createIndex("doneDatetime", "doneDatetime");
      }
    };

    dbReq.onsuccess = (e) => {
      todosDb = e.target.result;
      resolve(todosDb);
    };

    dbReq.onerror = (e) => {
      reject(e.target.errorCode);
    };
  });
}

export function setupTransaction({ storeName, method = "readonly" }) {
  const tx = todosDb.transaction([storeName], method);
  const store = tx.objectStore(storeName);

  return {
    tx,
    store,
  };
}

export function getTodos(status = "active") {
  return new Promise((resolve) => {
    const tx = todosDb.transaction(TODOS_STORE);

    let store = tx.objectStore(TODOS_STORE);

    store.getAll().onsuccess = (e) => {
      let result = e.target.result;
      if (status === "active") {
        result = result.filter((x) => !x.doneDatetime);
      } else if (status === "done") {
        result = result.filter((x) => x.doneDatetime);
      }

      resolve(result);
    };
  });
}

export function putTodo(todo) {
  return new Promise(async (resolve, reject) => {
    const { store, tx } = setupTransaction({
      storeName: "todos",
      method: "readwrite",
    });

    let finalTodo = todo;

    const [oldTodo, oldTodoError] = await promisifyRequest(
      store.get(todo.createdDatetime)
    );

    if (oldTodoError) {
      console.error(oldTodoError);
      return;
    }

    if (oldTodo) {
      finalTodo = { ...oldTodo, ...todo };
    }

    store.put(finalTodo);

    tx.oncomplete = () => {
      resolve(finalTodo);
    };

    tx.onerror = (event) => {
      reject(event.target.error.message);
    };
  });
}

export function deleteTodo(createdDatetime) {
  const { store } = setupTransaction({
    todosDb,
    storeName: "todos",
    method: "readwrite",
  });

  const deleteReq = store.delete(createdDatetime);

  return new Promise((resolve) => {
    deleteReq.onsuccess = () => resolve(true);
    deleteReq.onerror = () => reject();
  });
}
