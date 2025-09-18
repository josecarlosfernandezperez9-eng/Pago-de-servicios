import { createAuthenticatedClient} from "@interledger/open-payments";
import  fs  from "fs";
import { isFinalizedGrant } from "@interledger/open-payments";
import  Readline  from "readline/promises";

function Cliente() {
  let servicio = document.getElementById ("servicio").value;
  let monto = document.getElementById ("paymet-amount").value;
  const moneda = parseFloat(monto.value);
  let wallet = document.getElementById ("receiver-address").value;

// Objetivo: Realizar un pago entre pares entre dos direcciones de billetera (usando cuentas en la cuenta de prueba)
// ConfiguraciÃ³n inicial

// a. Importar dependencias y configurar el cliente

(async () => {
  const privateKey = fs.readFileSync("private.key", "utf8");
  const client = await createAuthenticatedClient({
    walletAddressUrl: "https://ilp.interledger-test.dev/jjumb", 
    privateKey: 'private.key',
    keyId: "56a7a7c4-ff03-4753-884c-d1208515c866",
        });

// 1. Obtener una concesiÃ³n para un pago entrante)

const sendingWalletAddress = await client.walletAddress.get({

        //la del que paga (cliente/usuario).
    url:'https://' + wallet.value
        } ); 

        //la del que cobra (empresa/servicio).
    const receivingwalletAddress = await client.walletAddress.get({
    url: "https://ilp.interledger-test.dev/jjumb"
        } );

     console.log(sendingWalletAddress, receivingwalletAddress);



// 2. Obtener una concesiÃ³n para un pago entrante

  console.log({ sendingWalletAddress, receivingwalletAddress });

  // Step 1: Get a grant for the incoming payment, so we can create the incoming payment on the receiving wallet address
  const incomingPaymentGrant = await client.grant.request(
    {
      url: receivingwalletAddress.authServer,
    },
    {
      access_token: {
        access: [
          {
            type: "incoming-payment",
            actions: ["create"],
          }
        ]
      }
    }
  );

 if (!isFinalizedGrant(incomingPaymentGrant)){
    throw new Error("se espera finalice su concesion");
 }

  console.log(incomingPaymentGrant);


// 3. Crear un pago entrante para el receptor

  const incomingPayment = await client.incomingPayment.create(
    {
      url: receivingwalletAddress.resourceServer,
      accessToken: incomingPaymentGrant.access_token.value,
    },
    {
      walletAddress: receivingwalletAddress.id,
      incomingAmount: {
        assetCode: receivingwalletAddress.assetCode,
        assetScale: receivingwalletAddress.assetScale,
        value: "moneda.value",
      },
    }
  );

  console.log({ incomingPayment });

// 4. Crear un concesion para una cotizacion

  const quoteGrant = await client.grant.request(
    {
        url: sendingWalletAddress.authServer,
    },
    {
        access_token: {
            access: [
                {
                    type: "quote",
                    actions: [ "create"],
                }
            ]
        }
    }
  );

  if ( !isFinalizedGrant(quoteGrant)){
    throw new Error("se espera finalice la concesion")
  }
  console.log(quoteGrant);

// 5. Obtener una cotizaciÃ³n para el remitente

const quote = await client.quote.create(
    {
        url: receivingwalletAddress.resourceServer,
        accessToken: quoteGrant.access_token.value,
    },
    {
        walletAddress: sendingWalletAddress.id,
        receiver: incomingPayment.id,
        method: "ilp",
    }
);

console.log({ quote });


// 6. Obtener una concesiÃ³n para un pago saliente

const outgoingPaymentGrant = await client.grant.request(
  {
    url: sendingWalletAddress.authServer,
  },
  {
    access_token: {
      access:[
        {
          type:"outgoing-payment",
          actions:["create"],
          limits: {
            debitAmount:quote.debitAmount,
          },
          identifier: sendingWalletAddress.id,
        }
      ]
    },
    interact:{
     start: ["redirect"],
    },
  }
);
console.log(outgoingPaymentGrant.interact);

return res.json({
  redirectUrl: outgoingPaymentGrant.interact.redirect, // <-- ESTA ES LA URL QUE DEBES ABRIR
  continueUri: outgoingPaymentGrant.continue.uri, // para después continuar el flujo
  continueToken: outgoingPaymentGrant.continue.access_token.value
});

async function confirmarPago() {
  const response = await fetch("/api/crear-pago");
  const data = await response.json();

  if (data.redirectUrl) {
    // Redirige al usuario al servidor de autorización
    window.location.href = data.redirectUrl;
  }
}

// 7. Continuar con la concesiÃ³n del pago saliente

await Readline
.createInterface({
  input: process.stdin,
  output: process.stdout,
})
.question("presione Enter para continuar con el pago saliente...");

// 8. Finalizar la concesiÃ³n del pago saliente

const finalizedOutgoingPaymentGrant= await client.grant.continue({
  url: outgoingPaymentGrant.continue.uri,
  accessToken: outgoingPaymentGrant.continue.access_token.value,
});
if ( !isFinalizedGrant(finalizedOutgoingPaymentGrant)){
  throw new Error("Se espera finalice la concesion");
}

// 9. Continuar con la cotizaciÃ³n de pago saliente

const outgoingPayment = await client.outgoingPayment.create(
  {
    url: sendingWalletAddress.resourceServer,
    accessToken: finalizedOutgoingPaymentGrant.access_token.value,
  },
  {
    walletAddress: sendingWalletAddress.id,
    quoteId: quote.id,
  }
);

console.log({ outgoingPayment});

})();
}
