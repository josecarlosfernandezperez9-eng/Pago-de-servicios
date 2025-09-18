import { createAuthenticatedClient } from "@interledger/open-payments";
import cors from 'cors'
import bodyParser from "body-parser";
import fs from "fs";
import { isFinalizedGrant } from "@interledger/open-payments";
import Readline from "readline/promises";
import express from 'express'
const app = express()
const port = 3000
app.use(bodyParser.json())
 app.use(cors({ origin: "*" }));


app.post('/pago', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*")

    const monto = req.body.monto
    const wallet = req.body.wallet
   
    console.log(monto, wallet)
    // Objetivo: Realizar un pago entre pares entre dos direcciones de billetera (usando cuentas en la cuenta de prueba)
    // ConfiguraciÃ³n inicial

    // a. Importar dependencias y configurar el cliente


    
      const privateKey = fs.readFileSync("private.key", "utf8");
      const client = await createAuthenticatedClient({
        walletAddressUrl: "https://ilp.interledger-test.dev/jjumb", 
        privateKey: 'private.key',
        keyId: "56a7a7c4-ff03-4753-884c-d1208515c866",
            });
    
    // 1. Obtener una concesiÃ³n para un pago entrante)
    
    const sendingWalletAddress = await client.walletAddress.get({
    
            //la del que paga (cliente/usuario).
        url:'https://' + wallet
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
            value: "monto",
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
    
    console.log({outgoingPaymentGrant});
    
    
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
    
    

    
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
