const csv = require('csv-parser');
const fs = require('fs');
const papa = require('papaparse');
const _= require('lodash');

//const phoneUtil = require('google-libphonenumber')
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
let locale = 'BR'

let newFieldCreated = 'addresses';

let filename = 'input.csv';
function readCSV(filePath){
    return fs.readFileSync(filePath, 'utf8');

}

function duplicateKeys(csvData){
    csvData = csvData.split("\n");
    csvData.splice(0, 1, csvData[0].split(','));
    
    for(let title = 0; title<csvData[0].length; title++){
        if(header[csvData[0][title]] == undefined || header[csvData[0][title]] == null){
            header[csvData[0][title]] = 0;
        }
        else{
            header[csvData[0][title]] += 1;
            csvData[0].splice(title, 1, csvData[0][title].concat(header[csvData[0][title]]));
        }
    }
    csvData.splice(0, 1, csvData[0].join(','));
    return csvData.join('\n');
}

function removeDuplicatedKeys(element, mappedKey){
    let separators = new RegExp(/\s*[",|\/|]\s*/);
    for(let key in mappedKey){
        if(mappedKey[key]>0){
            let temp = [];
            for(let value = parseInt(mappedKey[key]); value>=0; value--){
                if(value!==0){
                    temp=temp.concat(element[key+`${value}`].split(separators));
                    delete element[key+`${value}`];
                }
                else{
                    element[key]=element[key].split(separators).concat(temp);
                } 
            }
            element[key]=Array.from(new Set(element[key]));
        }
    }
    return element;
}
function formatEmail(data,key,emailsFound){
    let validEmail = new RegExp(/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/g);

    for(let email in emailsFound){
        if(email.match(validEmail) != null || email.match(validEmail) != undefined){
            data[newFieldCreated].concat({
                "type": key.split(' ')[0],
                "tags": key.split(' ').slice(1,key.split(' ').length),
                "address": email
            });
        }
    }
}
function formatPhone(data, key, phone){
    if(phoneUtil.isValidNumberForRegion(phone, locale)){
        data[newFieldCreated].concat({
            "type": key.split(' ')[0],
            "tags": key.split(' ').slice(1,key.split(' ').length),
            "address": phone.getCountryCode()+phone.getNationalNumber()
        });
    }
}
function removeEmptyFields(data){
    for(let key in data){
        if(key.split(' ')>1){
            delete data[key];
        }
    }
}
function formatFields(data){
    let firstNumberKey = '';
    let phone = false;
    let number = 0;
    let atSign = new RegExp(/([^\/\s:(){}]*.@.[^\/\s:(){}]*)/g);

    for(let key in data){
        try{
            number = phoneUtil.parseAndKeepRawInput(data[key], locale);
            phone = true;
        }catch(error){
            phone = false;
        }
        if (firstNumberKey === '' && !isNaN(data[key])){
            firstNumberKey = key;
        }
        else if(data[key].match(atSign) != null || data[key].match(atSign) != undefined){
            formatEmail(data[key].match(atSign));
            delete data[key];
        }
        else if(phone){
            formatPhone(data, key, number);
            delete data[key];
        }
        else if(key.split(' ').length > 1 && !Array.isArray(data[key])){
            if(data[key]=='' || data[key]==0 || data[key].toLowerCase()=='no' || data[key]===false || data[key]=='false'){
                data[key] = false;
            }
            else{
                data[key]=true;
            }
        }
    }
    removeEmptyFields(data);
}

function formatData(unstructuredData, keys){
    let structuredData = papa.parse(unstructuredData, {header:true});
    
    for(let item of structuredData.data){
        removeDuplicatedKeys(item, keys);
        item[newFieldCreated]=[];
        formatFields(item);
    }
    
    return structuredData;
}
let header = {};
let csvFile = readCSV(filename);
csvFile = duplicateKeys(csvFile);
let storedData = formatData(csvFile, header);
//data = _(data).groupBy('eid').map(_.spread(_.assign)).value();
console.log(storedData);
storedData = JSON.stringify(storedData.data);
console.log(storedData);


