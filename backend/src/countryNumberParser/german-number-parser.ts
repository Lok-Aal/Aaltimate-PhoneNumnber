import WrongFormatError from "../errors/wrong-format-error";
import { deutscheVorwahlen } from "../utils/dicts";
import { PhoneNumber } from "../utils/types";
import AbstractCountryNumberParser from "./abstract-number-parser";
import { CountryNumberParser } from "./country-number-parser";

export default class GermanNumberParser extends AbstractCountryNumberParser{

    phoneNumber: PhoneNumber = {
        landesvorwahl: "49",
        ortsvorwahl: "",
        hauptwahl: "",
        durchwahl: ""
    };

    parseOrtsvorwahl(): string {
        
        // Ortsvorwahl in Deutschland kann zwischen 3 (z. B. Essen) und 5 (z. B. Weesenstein) Ziffern lang sein

        const vorwahlLenghts = [3, 4, 5];

        /**
         * Ortsvorwahl kann in Klammern stehen (dann muss es nicht mehr gematcht werden)
         * Ortsvorwahl kann mit 0 beginnen, muss aber nicht
         */

        if(this.restNumber.startsWith("(")) {
            let index = this.restNumber.indexOf(")");
            if(index === -1) {
                throw new WrongFormatError(`${this.restNumber} (missing closing bracket in Ortsvorwahl)`);
            }
            this.phoneNumber.ortsvorwahl = this.restNumber.slice(1,index);
            this.restNumber = this.restNumber.slice(index + 1, this.restNumber.length); // Remove the part that was matched so the next function can work with the next substring
        }else{
            if(this.restNumber.startsWith("0")) {
                this.restNumber = this.restNumber.slice(1);
            }

            let match = false;
            for(let length of vorwahlLenghts) {
                const subNumber = this.restNumber.slice(0, length);
                match = match || (deutscheVorwahlen[subNumber] !== undefined);

                // Since the numbers are prefix numbers we can be sure that we found the vorwahl
                if(match) {
                    this.phoneNumber.ortsvorwahl = this.restNumber.slice(0, length);
                    this.restNumber = this.restNumber.slice(length);
                    break;
                }
            }

            if(!match) {
                throw new WrongFormatError(`${this.restNumber} (Ortsvorwahl not found in dict)`);
            }
        }

        // Prepare the restNumber for the next function (there could be a seperator between the Ortsvorwahl and the Hauptwahl)

        this.restNumber = this.restNumber.trim();
        if(this.separators.includes(this.restNumber[0])) {
            this.restNumber = this.restNumber.slice(1).trim();
        }

        return this.phoneNumber.ortsvorwahl;
    }

    parseHauptwahl(): string {


        // Hauptwahl can be enclosed in brackets or parentheses
        const hasEnclosure = this.enclosuresRegex.test(this.restNumber);

        if(hasEnclosure) {
            this.restNumber = this.restNumber.replace(this.enclosuresRegex, "").trim();
        }



        const hasSeparation = this.separatorsRegex.test(this.restNumber);

        if(!hasSeparation){
            this.phoneNumber.hauptwahl = this.restNumber;
            this.restNumber = "";
            return this.phoneNumber.hauptwahl;
        }

        // Filter because the number could be seperated by a symbol and a space (e.g. 123 456 / 789)
        const numberSplit = this.restNumber.split(this.separatorsRegex).filter((s) => s !== "");	

        if(numberSplit.length !== 2) {
            // The separation is unambiguous. There are more than 2 substrings so we need to check the substrings at the end of the whole string is a durchwahl
            const lastSubstring = numberSplit[numberSplit.length - 1];
            if(lastSubstring.length > this.maxDurchwahlLength) {
                // Its such a weird sidecase (according to the requirements that we just ignore the separator)
                return this.phoneNumber.hauptwahl = numberSplit.slice(0, numberSplit.length - 1).join("");
            }else{
                // The last substring is a durchwahl
                this.restNumber = lastSubstring;
                return this.phoneNumber.hauptwahl = numberSplit.slice(0, numberSplit.length - 2).join("");
            }
        }   

        this.phoneNumber.hauptwahl = numberSplit[0];
        this.restNumber = numberSplit[1];
        return this.phoneNumber.hauptwahl;
    }

    parseDurchwahl(): string {
        return this.phoneNumber.durchwahl = this.restNumber;
    }
}
