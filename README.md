# SimpleBCTT

## Introduction

The Buffalo Concussion Treadmill Test (BCTT) is a metric used by trained professionals (physical therapists, certified trainers, etc.) to help patients recovering from concussions and usually those suffering from post-concussive symptoms (PCS). This project will digitalize the traditional test into a mobile iOS application and web application such that it can be conducted more efficiently. Furthermore, the digital setup will permit the use of the data for health informatics and clinical decision support in future work.

Overall, the project consists of three main aspects. First, the IOS application. This is the patient-facing interface that prompts them along the BCTT and captures biometric information like their heart rate. Second, the front-end of the web server. This will require designing an interface for the physical therapists to input notes, capture data about the patient for the BCTT, and have a portal to all previous tests. Third, the back-end of the web server. This will entail receiving the data from the iOS app, saving it in a database, and using it to track performance.

## Related Work
While there has not been substantial literature pertaining to the digitization of the BCTT, there has been work in proving the efficacy and validity of the BCTT, particularly literature detailing the relationship between BCTT performance over time and concussion recovery.

Using Google Scholar, we searched for the following pairs of boolean search terms: “Buffalo concussion treadmill test” AND “digital”; “Buffalo concussion treadmill test”.

AND “FHIR” (acronym for fast healthcare interoperability resources, a standard in the electronic medical record field). There were no relevant search results that included these terms of interest, indicating that there is little or no work pertaining to implementing the Buffalo concussion treadmill test in a digital format.

## Conclusion

We have developed an iOS app in parallel with a webserver and front end capable of addressing the needs of a digital BCTT. While the BCTT test has remained largely unchanged since the late 20th century, few efforts have been made thus far to automate, digitize, or enhance the recording and analysis of the exam results. With this system, we wish to bring the BCTT into the era of EMRs and health informatics. 

The first part of our system is an iOS app. The iOS app is designed to read heart rate data using the Apple Watch’s sensors, display it on both the Apple Watch and the iPhone that the Watch is connected to, and relay that information to an endpoint of interest. If this app is to be commercialized, it may need additional encryption and authentication measures, as the data being sent is protected health information.

The second part of our system is a web-app. The web app is currently able to deploy a local network NodeJS server instance in order to connect with both the front end and the Apple Watch. Future work will entail further development on the front end to integrate seamlessly with EHR systems and to automate data analysis to provide clinical decision-making assistance.

By integrating this medical test with devices that are currently in everyday use by both the clinician and the patient, we are bringing ubiquitous computing to the forefront of medicine and primary care.

The efforts presented in this paper can serve as a framework for the digitization of other medical tests, and continue to bring ubiquitous computing to the field of medicine.


-------------


## Installation

Install [node v14](https://nodejs.org/en/).<br/>
Install the node packages with `npm install`.

### Run server
Run server with `node ./scripts/server.js`. Server will be hosted on `http://localhost:3000`.

## API Reference

| Method | Path              | Data  | Response | Description |
| -------| ----------------- | ----- | ---------| ----------- |
| POST   | /api/newsession | <pre>{<br>&nbsp;&nbsp;name: &lt;patient name&gt;<br>}</pre> | Session ID | Create a new BCTT session. |
| POST   | /api/endsession | <pre>{<br>&nbsp;&nbsp;sessionid: &lt;session id&gt;<br>}</pre> | - | End BCTT session. |
| POST   | /api/pushdata | <pre>{<br>&nbsp;&nbsp;data: [&lt;heart rate&gt;]<br>&nbsp;&nbsp;timestamp: [&lt;utc timestamp&gt;]<br>}</pre> | - | Push heart rate data. `data` and `timestamp` parameters expect json arrays of respective data. |

---------------

## Preview

![img](https://i.imgur.com/Whmyx1F.png)
![img](https://i.imgur.com/nhQNyIq.png)
