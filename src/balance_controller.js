const axios = require("axios");
const validate_client_balance = async (client_document) => {
  try {
    // Filtrar y buscar las facturas del cliente
    const literal_criteria = `Cliente.Documento=="${client_document}"&&Saldo>0&&Fecha_L==null`;
    const find_client_information = await axios.get(
      `https://zoho.accsolutions.tech/API/v1/Facturaci_n_Colombia_C?where=${encodeURIComponent(
        literal_criteria
      )}`
    );

    // Validate si el cliente existe y/o tiene saldo
    if (find_client_information.data.code == 200) {
      return {
        code: 200,
        balance: sumarSaldo(find_client_information.data.data),
        data: find_client_information.data.data,
      };
    } else {
      return {
        code: 400,
      };
    }
  } catch (error) {
    console.log(error);
    return {
      code: 400,
    };
  }
};

const sumarSaldo = (array) => {
  var sumaTotal = array.reduce((acumulador, currencyObject) => {
    return acumulador + parseFloat(currencyObject.Saldo);
  }, 0);

  return sumaTotal;
};

const create_intents = async (data) => {
    const date = new Date(); 
    const observations = `Fecha y hora: ${date.toISOString()} - Usuario: tsh${data.password}`
  try {
    const new_data = {
      Client: data.client_id,
      checkout: data.checkout,
      value: data.value,
      observation: observations
    };
    const response = await axios.post(
      `https://zoho.accsolutions.tech/API/v1/Abonos_automaticos`,
      new_data
    );
    if (response.data.code == 200) {
      return {
        code: 200,
      };
    } else {
      return {
        code: 400,
      };
    }
  } catch (error) {
    return {
      code: 400,
    };
  }
};

module.exports = { validate_client_balance, create_intents };
