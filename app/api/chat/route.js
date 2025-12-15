export async function POST(request) {
  try {
    const { messages, model } = await request.json();

    // Liste de modèles de secours (seulement les plus stables)
    const fallbackModels = [
      model || "mistralai/mistral-7b-instruct:free",
      "google/gemini-2.0-flash-exp:free",
      "mistralai/mistral-7b-instruct:free",
    ];

    // Dédupliquer les modèles
    const uniqueModels = [...new Set(fallbackModels)];

    let lastError = null;
    let attemptedModels = [];

    // Essayer chaque modèle jusqu'à ce qu'un fonctionne
    for (let i = 0; i < uniqueModels.length; i++) {
      const tryModel = uniqueModels[i];
      attemptedModels.push(tryModel);

      // Ajouter un petit délai entre les tentatives (sauf pour la première)
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      try {
        console.log(`Tentative avec ${tryModel}...`);
        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${
                process.env.OPENROUTER_API_KEY ||
                "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"
              }`,
              "HTTP-Referer":
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              "X-Title": "AI Chat Assistant",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: tryModel,
              messages: messages,
              temperature: 0.7,
              max_tokens: 4000,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error(`Erreur avec ${tryModel}:`, error);

          // Si c'est une erreur 404 (modèle non disponible), passer au suivant immédiatement
          if (response.status === 404) {
            console.log(
              `${tryModel} non disponible (404), essai du suivant...`
            );
            lastError = {
              status: 404,
              message: `Modèle non disponible`,
            };
            continue;
          }

          // Si c'est une erreur 429 (rate limit), essayer le modèle suivant
          if (response.status === 429) {
            console.log(`${tryModel} limité (429), essai du suivant...`);
            lastError = {
              status: 429,
              message: `Limite de requêtes atteinte`,
            };
            continue;
          }

          let errorMessage = "Erreur lors de la communication avec OpenRouter";
          try {
            const errorData = JSON.parse(error);
            if (errorData.error?.metadata?.raw) {
              errorMessage = errorData.error.metadata.raw;
            } else if (errorData.error?.message) {
              errorMessage = errorData.error.message;
            }
          } catch (e) {
            // Keep default message if parsing fails
          }

          lastError = {
            status: response.status,
            message: errorMessage,
            fullError: error,
          };
          continue;
        }

        // Succès ! Retourner la réponse
        const data = await response.json();

        // Extraire le contenu de la réponse
        let content = data.choices?.[0]?.message?.content || "Pas de réponse";

        // Nettoyer les balises spéciales du modèle (tokens Mistral, Llama, etc.)
        content = content
          .replace(/^<s>\s*/i, "") // Retire <s> au début
          .replace(/\s*<\/s>$/i, "") // Retire </s> à la fin
          .replace(/^\[B?_?INST\]\s*/i, "") // Retire [INST] ou [B_INST] au début
          .replace(/\s*\[\/B?_?INST\]$/i, "") // Retire [/INST] ou [/B_INST] à la fin
          .replace(/<\|im_start\|>/g, "") // Retire tokens ChatML
          .replace(/<\|im_end\|>/g, "")
          .replace(/^\s+/, "") // Retire espaces au début
          .replace(/\s+$/, ""); // Retire espaces à la fin

        // Ajouter une note si on a utilisé un modèle de secours
        const responseData = { content };
        if (tryModel !== uniqueModels[0]) {
          responseData.usedFallback = true;
          responseData.usedModel = tryModel;
          console.log(`✅ Succès avec le modèle de secours: ${tryModel}`);
        } else {
          console.log(`✅ Succès avec le modèle principal: ${tryModel}`);
        }

        return Response.json(responseData);
      } catch (fetchError) {
        console.error(`Erreur réseau avec ${tryModel}:`, fetchError);
        lastError = { status: 500, message: fetchError.message };
        continue;
      }
    }

    // Si tous les modèles ont échoué, retourner un message d'erreur convivial
    const errorMessage =
      lastError?.status === 429
        ? "⏳ Tous les modèles sont temporairement surchargés. Veuillez patienter 30 secondes et réessayer."
        : lastError?.status === 404
        ? "❌ Les modèles sont actuellement indisponibles. Réessayez dans quelques instants."
        : "❌ Impossible de se connecter aux modèles IA. Vérifiez votre connexion et réessayez.";

    return Response.json(
      {
        error: errorMessage,
        details: `Modèles essayés: ${attemptedModels
          .map((m) => m.split("/")[1] || m)
          .join(", ")}`,
      },
      { status: lastError?.status || 503 }
    );
  } catch (error) {
    console.error("Erreur serveur:", error);
    return Response.json(
      { error: "Erreur interne du serveur", details: error.message },
      { status: 500 }
    );
  }
}
