const csv = require('csv-parser');
const fs = require('fs');
const papa = require('papaparse');
const _= require('lodash');

//const phoneUtil = require('google-libphonenumber')
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
let locale = 'BR';

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
            element[key]=Array.from(element[key]);
            delete Object.assign(element, {[key+'s']: element[key] })[key];
        }
    }
    return element;
}
function formatEmail(data){
    let atSign = new RegExp(/([^\/\s:(){}]*.@.[^\/\s:(){}]*)/g);
    for(let key in data){
        if(!Array.isArray(data[key])){
            let emailsFound = data[key].match(atSign);
            if(emailsFound != null || emailsFound != undefined){
                for(let email in emailsFound){
                    data[newFieldCreated].push({
                        "type": key.split(' ')[0],
                        "tags": key.split(' ').slice(1,key.split(' ').length),
                        "address": emailsFound[email]
                    });
                }
                delete data[key];
            }
            
        }
    }
    return data;
    
}
function formatPhone(data){
    let firstNumberKey = '';
    let phone = false;
    let number = 0;

    for(let key in data){
        try{
            number = phoneUtil.parseAndKeepRawInput(data[key], locale);
            phone = true;
        }catch(error){
            phone = false;
        }
        if(firstNumberKey === '' && !isNaN(data[key])){
            firstNumberKey=key;
        }
        else if(phone){
            if(phoneUtil.isValidNumberForRegion(number, locale)){
            data[newFieldCreated].push({
                "type": key.split(' ')[0],
                "tags": key.split(' ').slice(1,key.split(' ').length),
                "address": `${number.getCountryCode()}${number.getNationalNumber()}`
                });
            }
            delete data[key];
        }
        
    }
    return data;
}
function removeEmptyFields(data){
    for(let key in data){
        if(key.split(' ').length>1){
            delete data[key];
        }
    }
    return data;
}
function formatBooleanFields(data){
    let firstNumberKey = '';
    for(let key in data){
        if(firstNumberKey === '' && !isNaN(data[key])){
            firstNumberKey=key;
        }
        else if(Array.isArray(data[key])===false && data[key].length <=3){
            if(data[key]=='' || data[key]==0 || data[key].toLowerCase()=='n' || data[key].toLowerCase()=='no' || data[key]===false || data[key]=='false'){
                data[key] = false;
            }
            else if(data[key]==1 || data[key].toLowerCase()=='y'|| data[key].toLowerCase()=='yes' || data[key]!==false || data[key]!='false'){
                data[key]=true;
            }
        }
    }
    return data;
} 
function formatData(unstructuredData, keys){
    let structuredData = papa.parse(unstructuredData, {header:true});
    for(let item =0 ; item < structuredData.data.length; item++){
        
        structuredData.data[item][newFieldCreated]=[];
        structuredData.data.splice(item, 1, formatEmail(structuredData.data[item]));
        structuredData.data.splice(item, 1, formatPhone(structuredData.data[item]));
        structuredData.data.splice(item, 1, removeDuplicatedKeys(structuredData.data[item], keys));
        structuredData.data.splice(item, 1, formatBooleanFields(structuredData.data[item]));
        structuredData.data.splice(item, 1, removeEmptyFields(structuredData.data[item]));
        
    }
    
    return structuredData;
}
function removeUndesiredItems(array){
    for(let index = 0; index<array.length; index++){
        if(array[index]===''){
            array.splice(index, 1);
        }
        else{
            array.splice(index, 1, array[index].replace(/\s+/g, '').trim());
        }        
    }
}
function removeRepeatedItems(array){
    for(let item in array){
        for(let key in array[item]){
            if(Array.isArray(array[item][key]) && 
            array[item][key].some(values => typeof values == 'string')){
                removeUndesiredItems(array[item][key]);
                array[item][key] = Array.from(new Set(array[item][key])).sort();
            }
        }
    }
}
let header = {};

function main(){
    let csvFile = readCSV(filename);
    csvFile = duplicateKeys(csvFile);
    let storedData = formatData(csvFile, header);
    let order = '';
    
    for(let key in storedData.data[0]){
        if(!isNaN(storedData.data[0][key])){
            order = key;
            break;
        }    
    }
    const result = _(storedData.data)
    .groupBy(order)
    .map((g) => _.mergeWith({}, ...g, (obj, src) =>
        _.isArray(obj) ? obj.concat(src) : undefined))
    .value();
    removeRepeatedItems(result);
    console.log(JSON.stringify(result, null, 2));
}
main();

