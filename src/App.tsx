import { useEffect, useMemo, useState } from "react";

import {
  createOrder,
  getProducts,
  Product,
  API_URL,
  CreateOrderRequest,
} from "./api";

import logoDore from "./assets/logoDore.png";
import logo from "./assets/cotenoireLogo.png";


// =====================================================
// CATÉGORIES
// =====================================================

const cats = [
  "Tout",
  "Nouveauté",
  "Fleurs",
  "Bougies",
  "Diffuseurs",
  "Cadeaux",
];

// Navigation principale : la catégorie "Nouveauté" reste disponible
// dans les filtres produits, mais n'est pas répétée dans la barre haute/mobile.
const sidebarCats = [
  "Tout",
  "Fleurs",
  "Bougies",
  "Diffuseurs",
  "Cadeaux",
];


// =====================================================
// PANIER
// =====================================================

type CartItem = {
  p: Product;
  q: number;
};


// =====================================================
// IMAGE PRODUIT
// =====================================================

function img(p: Product) {
  return `${API_URL}/products/${p.id}/image`;
}


// =====================================================
// APPLICATION
// =====================================================

export default function App() {

  // =====================================================
  // PRODUITS
  // =====================================================

  const [products, setProducts] = useState<Product[]>([]);

  const [active, setActive] = useState("Tout");

  const [search, setSearch] = useState("");


  // =====================================================
  // PANIER
  // =====================================================

  const [cart, setCart] = useState<CartItem[]>([]);


  // =====================================================
  // CHECKOUT
  // =====================================================

  const [checkout, setCheckout] = useState(false);


  // =====================================================
  // PRODUIT SÉLECTIONNÉ
  // =====================================================

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);


  // =====================================================
  // COMMANDE ENVOYÉE
  // =====================================================

  const [sent, setSent] = useState(false);


  // =====================================================
  // LOADING
  // =====================================================

  const [loading, setLoading] = useState(true);


  // =====================================================
  // TOAST
  // =====================================================

  const [toast, setToast] = useState("");


  // =====================================================
  // HISTORIQUE DES PRIX
  // =====================================================

  const [priceHistory, setPriceHistory] = useState<
    Record<string, { last: number; old?: number }>
  >(() => {

    try {

      return JSON.parse(
        localStorage.getItem(
          "cote-noire-price-history"
        ) || "{}"
      );

    } catch {

      return {};

    }

  });


  // =====================================================
  // CHARGEMENT DES PRODUITS
  // =====================================================

  const loadProducts = async () => {

    try {

      const data = await getProducts();


      const saved: Record<
        string,
        { last: number; old?: number }
      > = (() => {

        try {

          return JSON.parse(
            localStorage.getItem(
              "cote-noire-price-history"
            ) || "{}"
          );

        } catch {

          return {};

        }

      })();


      const next = { ...saved };


      data.forEach((p) => {

        const key = String(p.id);

        const current = Number(p.price);

        const previous = saved[key]?.last;

        let old = saved[key]?.old;


        // -------------------------------------------------
        // DÉTECTION D'UNE BAISSE DE PRIX
        // -------------------------------------------------

        if (
          previous !== undefined &&
          current < previous
        ) {

          old = previous;

        }


        // -------------------------------------------------
        // FIN DE PROMOTION
        // -------------------------------------------------

        if (
          old !== undefined &&
          current >= old
        ) {

          old = undefined;

        }


        next[key] = {
          last: current,

          ...(old !== undefined
            ? { old }
            : {}),
        };

      });


      setProducts(data);

      setPriceHistory(next);


      localStorage.setItem(
        "cote-noire-price-history",
        JSON.stringify(next)
      );


    } catch (error) {

      console.error(
        "❌ Erreur chargement produits :",
        error
      );

      setProducts([]);


    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // CHARGEMENT INITIAL + ACTUALISATION
  // =====================================================

  useEffect(() => {

    loadProducts();


    const timer = window.setInterval(
      loadProducts,
      30000
    );


    return () => {

      window.clearInterval(timer);

    };

  }, []);


  // =====================================================
  // FILTRAGE DES PRODUITS
  // =====================================================

  const list = useMemo(() => {

    return products

      // -------------------------------------------------
      // PRODUITS ACTIFS
      // -------------------------------------------------

      .filter(
        (p) => p.active !== false
      )


      // -------------------------------------------------
      // CATÉGORIE
      // -------------------------------------------------

      .filter((p) => {

        if (active === "Tout") {

          return true;

        }


        if (active === "Nouveauté") {

          return (
            p.category?.toLowerCase() ===
              "nouveauté" ||
            Boolean(
              p.isNew ||
              p.newProduct ||
              p.nouveaute
            )
          );

        }


        return (
          p.category?.toLowerCase() ===
          active.toLowerCase()
        );

      })


      // -------------------------------------------------
      // RECHERCHE
      // -------------------------------------------------

      .filter((p) =>
        p.name
          .toLowerCase()
          .includes(
            search
              .toLowerCase()
              .trim()
          )
      );

  }, [
    products,
    active,
    search,
  ]);


  // =====================================================
  // SOUS-TOTAL
  // =====================================================

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.p.price) *
        item.q,
    0
  );


  // =====================================================
  // LIVRAISON
  // =====================================================

  const deliveryFee = cart.length ? 7 : 0;


  // =====================================================
  // TOTAL
  // =====================================================

  const grand = subtotal + deliveryFee;


  // =====================================================
  // NOUVEAUTÉ
  // =====================================================

  const isNewProduct = (
    p: Product
  ) => {

    return Boolean(
      p.isNew ||
      p.newProduct ||
      p.nouveaute
    );

  };


  // =====================================================
  // ANCIEN PRIX
  // =====================================================

  const previousPrice = (
    p: Product
  ) => {

    const explicit =
      p.oldPrice ??
      p.previousPrice;


    if (
      explicit !== undefined &&
      Number(explicit) >
        Number(p.price)
    ) {

      return Number(explicit);

    }


    const remembered =
      priceHistory[
        String(p.id)
      ]?.old;


    if (
      remembered !== undefined &&
      remembered >
        Number(p.price)
    ) {

      return remembered;

    }


    return undefined;

  };


  // =====================================================
  // POURCENTAGE DE RÉDUCTION
  // =====================================================

  const discountPercent = (
    p: Product
  ) => {

    const old =
      previousPrice(p);


    if (
      !old ||
      old <= Number(p.price)
    ) {

      return 0;

    }


    return Math.round(
      (
        (old -
          Number(p.price)) /
        old
      ) * 100
    );

  };


  // =====================================================
  // AJOUT AU PANIER
  // =====================================================

  const add = (
    p: Product
  ) => {

    if (
      !p.active ||
      p.stock <= 0
    ) {

      setToast(
        "Produit indisponible"
      );


      window.setTimeout(
        () => setToast(""),
        2200
      );


      return;

    }


    setCart((current) => {

      const found =
        current.find(
          (item) =>
            item.p.id === p.id
        );


      if (found) {

        return current.map(
          (item) =>
            item.p.id === p.id
              ? {
                  ...item,

                  q: Math.min(
                    item.q + 1,
                    p.stock
                  ),
                }
              : item
        );

      }


      return [
        ...current,

        {
          p,
          q: 1,
        },
      ];

    });


    setToast(
      `${p.name} ajouté au panier`
    );


    window.setTimeout(
      () => setToast(""),
      2200
    );

  };


  // =====================================================
  // DIMINUER QUANTITÉ
  // =====================================================

  const decrease = (
    id: number
  ) => {

    setCart((current) =>
      current.flatMap(
        (item) => {

          if (
            item.p.id !== id
          ) {

            return [item];

          }


          if (item.q > 1) {

            return [
              {
                ...item,

                q:
                  item.q - 1,
              },
            ];

          }


          return [];

        }
      )
    );

  };


  // =====================================================
  // SUPPRIMER DU PANIER
  // =====================================================

  const remove = (
    id: number
  ) => {

    setCart((current) =>
      current.filter(
        (item) =>
          item.p.id !== id
      )
    );

  };


  // =====================================================
  // OUVRIR CHECKOUT
  // =====================================================

  const openCheckout = () => {

    if (
      cart.length === 0
    ) {

      setToast(
        "Votre panier est vide"
      );


      window.setTimeout(
        () => setToast(""),
        2200
      );


      return;

    }


    setSent(false);

    setCheckout(true);

  };


  // =====================================================
  // CRÉATION DE LA COMMANDE
  // =====================================================

  async function submit(
    e: React.FormEvent<HTMLFormElement>
  ) {

    e.preventDefault();


    if (
      cart.length === 0
    ) {

      alert(
        "Le panier est vide."
      );

      return;

    }


    const form =
      new FormData(
        e.currentTarget
      );


    // ===================================================
    // CUSTOMER
    // ===================================================

    const customer = {

      firstName: String(
        form.get(
          "firstName"
        ) || ""
      ).trim(),

      lastName: String(
        form.get(
          "lastName"
        ) || ""
      ).trim(),

      email: String(
        form.get(
          "email"
        ) || ""
      ).trim(),

      phone: String(
        form.get(
          "phone"
        ) || ""
      ).trim(),

      address: String(
        form.get(
          "address"
        ) || ""
      ).trim(),

      city: String(
        form.get(
          "city"
        ) || ""
      ).trim(),

      postalCode: String(
        form.get(
          "postalCode"
        ) || ""
      ).trim(),

    };


    // ===================================================
    // ORDER ITEMS
    // ===================================================

    const items =
      cart.map(
        (item) => ({

          productId:
            item.p.id,

          quantity:
            item.q,

        })
      );


    // ===================================================
    // PAYLOAD
    // ===================================================

    const payload:
      CreateOrderRequest =
    {

      customer,

      items,

      deliveryMethod:
        "STANDARD",

      paymentMethod:
        "CASH_ON_DELIVERY",

      giftMessage:
        String(
          form.get(
            "giftMessage"
          ) || ""
        ).trim(),

    };


    console.log(
      "================================"
    );

    console.log(
      "📦 CUSTOMER :",
      customer
    );

    console.log(
      "📦 ORDER ITEMS :",
      items
    );

    console.log(
      "📦 PAYLOAD COMPLET :",
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    console.log(
      "================================"
    );


    try {

      await createOrder(
        payload
      );


      // -------------------------------------------------
      // COMMANDE RÉUSSIE
      // -------------------------------------------------

      setSent(true);


      // -------------------------------------------------
      // VIDER PANIER
      // -------------------------------------------------

      setCart([]);


      // -------------------------------------------------
      // RECHARGER LES PRODUITS
      // -------------------------------------------------

      await loadProducts();


    } catch (error) {

      console.error(
        "❌ Création commande impossible :",
        error
      );


      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la création de la commande."
      );

    }

  }


  // =====================================================
  // INTERFACE
  // =====================================================

  return (

    <div className="app">


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div
          className="brand"
          style={{
            display:
              "flex",

            flexDirection:
              "column",

            alignItems:
              "center",

            justifyContent:
              "center",
          }}
        >

          <div className="crest">

            <img
              id="brandLogo"
              className="brandLogo"
              src={logo}
              alt="Côte Noire"
            />

          </div>

        </div>


        <nav className="sideNav">

          {sidebarCats
            .map(
              (
                category,
                index
              ) => (

                <button
                  className={
                    active ===
                      category
                      ? "selected"
                      : ""
                  }

                  key={
                    category
                  }

                  onClick={() =>
                    setActive(
                      category
                    )
                  }
                >

                  <span className="sideIcon">

                    {
                      [
                        "○",
                        "✦",
                        "❀",
                        "▣",
                        "⌁",
                        "♔",
                      ][index]
                    }

                  </span>

                  {category}

                </button>

              )
            )}

        </nav>

      </aside>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="main">


        {/* =================================================
            SEARCH / PANIER
        ================================================= */}

        <header className="searchBar">

          <button
            className="iconBtn cartTopButton"

            onClick={
              openCheckout
            }

            aria-label="Ouvrir le panier"
          >

            <span>
              🛒
            </span>

            <em>
              {cart.reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  item.q,
                0
              )}
            </em>

          </button>

        </header>


        {/* =================================================
            HERO
        ================================================= */}

        <section className="hero">

          <div className="heroText">

            <h1>

              L’ART DE

              <br />

              <i>
                SUBLIMER
              </i>

            </h1>


            <h2>
              VOTRE INTÉRIEUR
            </h2>


            <div className="line" />


            <span>

              Depuis 1998,
              Côte Noire
              imagine des
              créations
              parfumées
              d’exception,
              pensées pour
              offrir ou
              simplement se
              faire plaisir.
              Des compositions
              florales
              raffinées,
              sublimées dans
              de magnifiques
              écrins en verre.

            </span>


            <button
              onClick={() =>
                document
                  .getElementById(
                    "products"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
            >

              DÉCOUVRIR

              <b>
                →
              </b>

            </button>

          </div>


          <div className="heroCrest">

            <img

              id="logoDore"
              src={logoDore}
              alt="Côte Noire"
            />

          </div>

        </section>


        {/* =================================================
            PRODUCTS
        ================================================= */}

        <section
          id="products"
          className="productsSection"
        >


          {/* =================================================
              HEADER PRODUCTS
          ================================================= */}

          <div className="sectionHead">

            <div>

              <h2>

                Pièces{" "}

                <i>
                  signature
                </i>

              </h2>

            </div>


            <div className="filters">

              {cats.map(
                (category) => (

                  <button
                    className={
                      active ===
                        category
                        ? "active"
                        : ""
                    }

                    onClick={() =>
                      setActive(
                        category
                      )
                    }

                    key={
                      category
                    }
                  >

                    {
                      category.toUpperCase()
                    }

                  </button>

                )
              )}

            </div>

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (

            <div className="empty">

              Chargement des créations…

            </div>

          )}


          {/* =================================================
              GRILLE PRODUITS
          ================================================= */}

          <div className="grid">

            {list.map(
              (p) => (

                <article
                  className="product"

                  key={p.id}

                  onClick={() =>
                    setSelectedProduct(
                      p
                    )
                  }

                  role="button"

                  tabIndex={0}

                  onKeyDown={(e) => {

                    if (
                      e.key ===
                      "Enter"
                    ) {

                      setSelectedProduct(
                        p
                      );

                    }

                  }}
                >


                  {/* =================================================
                      IMAGE
                  ================================================= */}

                  <div className="photo">


                    {/* NOUVEAUTÉ */}

                    {isNewProduct(
                      p
                    ) && (

                      <label className="badge newBadge">

                        NOUVEAUTÉ

                      </label>

                    )}


                    {/* PROMOTION */}

                    {discountPercent(
                      p
                    ) > 0 && (

                      <label className="badge discountBadge">

                        −
                        {
                          discountPercent(
                            p
                          )
                        }
                        %

                      </label>

                    )}


                    {/* RUPTURE */}

                    {p.stock <= 0 && (

                      <span className="outOfStock">

                        Rupture de stock

                      </span>

                    )}


                    {/* IMAGE */}

                    <img
                      src={img(p)}

                      alt={
                        p.name
                      }

                      onError={(e) => {

                        e.currentTarget.style.display =
                          "none";

                      }}

                    />


                    {/* AJOUT RAPIDE */}

                    <button
                      className="quick"

                      aria-label={
                        `Ajouter ${p.name} au panier`
                      }

                      disabled={
                        p.stock <= 0
                      }

                      onClick={(e) => {

                        e.stopPropagation();

                        add(p);

                      }}
                    >

                      +

                    </button>


                  </div>


                  {/* =================================================
                      INFORMATIONS
                  ================================================= */}

                  <div className="productInfo">


                    <small>

                      {
                        p.category ||
                        "Collection"
                      }

                      {isNewProduct(
                        p
                      )
                        ? " · NOUVEAUTÉ"
                        : ""}

                    </small>


                    <h3>

                      {p.name}

                    </h3>


                    <p>

                      {
                        p.description ||
                        "Une création Côte Noire pensée pour sublimer votre intérieur."
                      }

                    </p>


                    {/* =================================================
                        PRIX
                    ================================================= */}

                    <div className="priceRow">


                      {previousPrice(
                        p
                      ) !== undefined && (

                        <del>

                          {
                            previousPrice(
                              p
                            )!.toFixed(0)
                          }{" "}
                          DT

                        </del>

                      )}


                      <strong>

                        {
                          Number(
                            p.price
                          ).toFixed(0)
                        }{" "}
                        DT

                      </strong>


                      {discountPercent(
                        p
                      ) > 0 && (

                        <span className="discountText">

                          −
                          {
                            discountPercent(
                              p
                            )
                          }%

                        </span>

                      )}

                    </div>


                  </div>


                </article>

              )
            )}

          </div>


          {/* =================================================
              AUCUN PRODUIT
          ================================================= */}

          {!list.length &&
            !loading && (

              <div className="empty">

                Aucune création ne
                correspond à votre
                recherche.

              </div>

            )}

        </section>

      </main>


      {/* =====================================================
          PRODUCT DETAIL
      ===================================================== */}

      {selectedProduct && (

        <div
          className="overlay"

          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {

              setSelectedProduct(
                null
              );

            }

          }}
        >


          <div className="productModal">


            {/* CLOSE */}

            <button
              className="close"

              onClick={() =>
                setSelectedProduct(
                  null
                )
              }
            >

              ×

            </button>


            {/* IMAGE */}

            <div className="detailImage">

              <img
                src={img(
                  selectedProduct
                )}

                alt={
                  selectedProduct.name
                }

                onError={(e) => {

                  e.currentTarget.style.display =
                    "none";

                }}

              />

            </div>


            {/* CONTENT */}

            <div className="detailContent">


              <span className="detailEyebrow">

                {
                  selectedProduct.category ||
                  "Collection Côte Noire"
                }


                {isNewProduct(
                  selectedProduct
                ) && (

                  <b className="detailNew">

                    NOUVEAUTÉ

                  </b>

                )}

              </span>


              <h2>

                {
                  selectedProduct.name
                }

              </h2>


              {/* PRIX */}

              <div className="detailPrice">


                {previousPrice(
                  selectedProduct
                ) && (

                  <del>

                    {
                      previousPrice(
                        selectedProduct
                      )!.toFixed(0)
                    }{" "}
                    DT

                  </del>

                )}


                <strong>

                  {
                    Number(
                      selectedProduct.price
                    ).toFixed(0)
                  }{" "}
                  DT

                </strong>


                {discountPercent(
                  selectedProduct
                ) > 0 && (

                  <span className="discountText">

                    −
                    {
                      discountPercent(
                        selectedProduct
                      )
                    }%

                  </span>

                )}

              </div>


              <div className="detailLine" />


              {/* DESCRIPTION */}

              <div className="detailDescriptionBlock">

                <div className="detailSectionTitle">Description</div>

                <p className="detailDescription">
                  {
                    selectedProduct.description ||
                    "Une création Côte Noire pensée pour sublimer votre intérieur et apporter une signature élégante à votre espace."
                  }
                </p>

              </div>


              {/* DÉTAILS PRODUIT */}

              <div className="detailSpecs">

                <div className="detailSpec">
                  <span>Catégorie</span>
                  <strong>
                    {selectedProduct.category || "Collection Côte Noire"}
                  </strong>
                </div>

                <div className="detailSpec">
                  <span>Parfum</span>
                  <strong>
                    {selectedProduct.scent || "Signature Côte Noire"}
                  </strong>
                </div>

                <div className="detailSpec">
                  <span>Référence</span>
                  <strong>CN-{selectedProduct.id}</strong>
                </div>

                <div className="detailSpec">
                  <span>Disponibilité</span>
                  <strong className={selectedProduct.stock > 0 ? "inStock" : "outStock"}>
                    {selectedProduct.stock > 0
                      ? "Disponible"
                      : "Pas disponible"}
                  </strong>
                </div>

              </div>


              {/* ADD */}

              <button
                className="detailAdd"

                disabled={
                  selectedProduct.stock <=
                  0
                }

                onClick={() => {

                  add(
                    selectedProduct
                  );

                  setSelectedProduct(
                    null
                  );

                }}
              >

                AJOUTER AU PANIER

                <span>
                  →
                </span>

              </button>


            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast && (

        <div
          className="toast"
          role="status"
        >

          <span>
            ✓
          </span>

          {toast}

        </div>

      )}


      {/* =====================================================
          CHECKOUT
      ===================================================== */}

      {checkout && (

        <div
          className="overlay"

          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {

              setCheckout(
                false
              );

            }

          }}
        >


          <div className="modal">


            {/* CLOSE */}

            <button
              className="close"

              onClick={() =>
                setCheckout(
                  false
                )
              }
            >

              ×

            </button>


            {!sent ? (

              <>


                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="modalHead">

                  <p>
                    VOTRE COMMANDE
                  </p>

                  <h2>

                    Finaliser{" "}

                    <i>
                      votre achat
                    </i>

                  </h2>

                </div>


                {/* =================================================
                    PANIER VIDE
                ================================================= */}

                {cart.length ===
                  0 ? (

                  <div className="empty">

                    Votre panier est
                    vide.

                    <br />

                    <small>

                      Ajoutez des produits
                      pour passer une
                      commande.

                    </small>

                  </div>

                ) : (

                  <>


                    {/* =================================================
                        PANIER
                    ================================================= */}

                    <div className="cartItems">

                      {cart.map(
                        (item) => (

                          <div
                            className="cartItem"

                            key={
                              item.p.id
                            }
                          >


                            {/* IMAGE */}

                            <div className="cartThumb">

                              <img
                                src={img(
                                  item.p
                                )}

                                alt={
                                  item.p.name
                                }

                                onError={(e) => {

                                  e.currentTarget.style.display =
                                    "none";

                                }}

                              />

                            </div>


                            {/* INFORMATIONS */}

                            <div className="cartItemInfo">

                              <small>

                                {
                                  item.p.category ||
                                  "Collection"
                                }

                              </small>


                              <h3>

                                {
                                  item.p.name
                                }

                              </h3>


                              <strong>

                                {
                                  Number(
                                    item.p.price
                                  ).toFixed(0)
                                }{" "}
                                DT

                              </strong>


                              {/* QUANTITÉ */}

                              <div className="qty">


                                <button
                                  type="button"

                                  onClick={() =>
                                    decrease(
                                      item.p.id
                                    )
                                  }
                                >

                                  −

                                </button>


                                <span>

                                  {
                                    item.q
                                  }

                                </span>


                                <button
                                  type="button"

                                  onClick={() =>
                                    add(
                                      item.p
                                    )
                                  }

                                  disabled={
                                    item.q >=
                                    item.p.stock
                                  }
                                >

                                  +

                                </button>


                                <button
                                  type="button"

                                  className="remove"

                                  onClick={() =>
                                    remove(
                                      item.p.id
                                    )
                                  }
                                >

                                  Retirer

                                </button>


                              </div>

                            </div>


                            {/* TOTAL PRODUIT */}

                            <div className="cartItemTotal">

                              {
                                (
                                  Number(
                                    item.p.price
                                  ) *
                                  item.q
                                ).toFixed(0)
                              }{" "}
                              DT

                            </div>


                          </div>

                        )
                      )}

                    </div>


                    {/* =================================================
                        CUSTOMER
                    ================================================= */}

                    <form
                      onSubmit={
                        submit
                      }
                    >


                      <div className="fields">


                        <input
                          name="firstName"
                          placeholder="Prénom *"
                          required
                        />


                        <input
                          name="lastName"
                          placeholder="Nom *"
                          required
                        />


                        <input
                          name="email"
                          type="email"
                          placeholder="Email *"
                          required
                        />


                        <input
                          name="phone"
                          placeholder="Téléphone *"
                          required
                        />


                        <input
                          name="address"
                          placeholder="Adresse *"
                          required
                        />


                        <input
                          name="city"
                          placeholder="Ville *"
                          required
                        />


                        <input
                          name="postalCode"
                          placeholder="Code postal *"
                          required
                        />


                      </div>


                      {/* =================================================
                          PAIEMENT
                      ================================================= */}

                      <div className="payment">

                        PAIEMENT À LA
                        LIVRAISON

                        <span>

                          Vous payez en espèces
                          à la réception.

                        </span>

                      </div>


                      {/* =================================================
                          TOTAL
                      ================================================= */}

                      <div className="summary">


                        <span>
                          Sous-total
                        </span>


                        <b>

                          {
                            subtotal.toFixed(0)
                          }{" "}
                          DT

                        </b>


                        <span>
                          Livraison
                        </span>


                        <b>

                          7 DT

                        </b>


                        <strong>
                          Total
                        </strong>


                        <strong>

                          {
                            grand.toFixed(0)
                          }{" "}
                          DT

                        </strong>


                      </div>


                      {/* =================================================
                          CONFIRMATION
                      ================================================= */}

                      <button
                        className="submit"
                        type="submit"
                      >

                        CONFIRMER LA
                        COMMANDE →

                      </button>


                    </form>

                  </>

                )}

              </>

            ) : (


              /* =================================================
                 SUCCÈS
              ================================================= */

              <div className="success">


                <div>
                  ✓
                </div>


                <h2>

                  Merci pour votre
                  commande

                </h2>


                <p>

                  Votre commande a
                  bien été enregistrée.
                  Vous paierez à la
                  livraison.

                </p>


                <button
                  onClick={() => {

                    setCheckout(
                      false
                    );

                    setSent(
                      false
                    );

                  }}
                >

                  CONTINUER MES ACHATS

                </button>


              </div>

            )}

          </div>

        </div>

      )}

    </div>

  );

}