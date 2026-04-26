const MAX_POKEMON_ID = 1025;

const btn = document.getElementById("fetch-btn");
const cardInner = document.getElementById("card-inner");
const status = document.getElementById("status");

function showLoading() {
  cardInner.innerHTML = '<div class="spinner" aria-label="読み込み中"></div>';
  status.textContent = "読み込み中…";
  status.classList.remove("error");
}

function showError(message) {
  cardInner.innerHTML = '<div class="placeholder"><span>!</span></div>';
  status.textContent = message;
  status.classList.add("error");
}

function renderPokemon(data) {
  const image =
    data.sprites?.other?.["official-artwork"]?.front_default ||
    data.sprites?.front_default ||
    "";

  const types = (data.types || [])
    .map((t) => {
      const name = t.type.name;
      return `<span class="type type-${name}">${name}</span>`;
    })
    .join("");

  const paddedId = String(data.id).padStart(4, "0");

  cardInner.innerHTML = `
    <div class="pokemon">
      ${
        image
          ? `<img class="pokemon-image" src="${image}" alt="${data.name}" />`
          : '<div class="placeholder"><span>?</span></div>'
      }
      <h2 class="pokemon-name">${data.name}</h2>
      <p class="pokemon-id">No. ${paddedId}</p>
      <div class="types">${types}</div>
    </div>
  `;
  status.textContent = "";
  status.classList.remove("error");
}

async function fetchRandomPokemon() {
  const id = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
  btn.disabled = true;
  showLoading();

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    renderPokemon(data);
  } catch (err) {
    console.error(err);
    showError("ポケモンの取得に失敗しました。もう一度お試しください。");
  } finally {
    btn.disabled = false;
  }
}

btn.addEventListener("click", fetchRandomPokemon);

window.addEventListener("DOMContentLoaded", fetchRandomPokemon);
