// https://ilp.interledger-test.dev/bostest Cliente
// https://ilp.interledger-test.dev/johana Remitente
// https://ilp.interledger-test.dev/josec Receptor

// Tutorial del cliente de Open Payments
// Objetivo: Realizar un pago entre pares entre dos direcciones de billetera (usando cuentas en la cuenta de prueba)
//
// ConfiguraciÃ³n inicial

import { createAuthenticatedClient} from "@interledger/open-payments";
import  fs  from "fs";
import { isFinalizedGrant } from "@interledger/open-payments";

// a. Importar dependencias y configurar el cliente

(async () => {
  const privateKey = fs.readFileSync("private.key", "utf8");
  const client = await createAuthenticatedClient({
    walletAddressUrl: "https://ilp.interledger-test.dev/jjumb", 
    privateKey: 'private.key',
    keyId: "56a7a7c4-ff03-4753-884c-d1208515c866",
        });

 // b. Crear una instancia del cliente Open Payments



    // c. Cargar la clave privada del archivo


    // d. Configurar las direcciones de las billeteras del remitente y el receptor



    // Flujo de pago entre pares



// 1. Obtener una concesiÃ³n para un pago entrante)

const sendingWalletAddress = await client.walletAddress.get({
    url:"https://ilp.interledger-test.dev/johana"
        } );

    const receivingwalletAddress = await client.walletAddress.get({
    url: "https://ilp.interledger-test.dev/josec"
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
        value: "10",
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

const outgoingPaymentGrant =

// 7. Continuar con la concesiÃ³n del pago saliente
// 8. Finalizar la concesiÃ³n del pago saliente
// 9. Continuar con la cotizaciÃ³n de pago saliente
})();