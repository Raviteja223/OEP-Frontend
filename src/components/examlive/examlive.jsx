import React, { Component } from "react";
import moment from "moment";

import BiggerLogo from "./../resources/images/Bigger-logo.png";
import MediumLogo from "./../resources/images/Logo-medium.png";

import Footer from "./../modules/footer/footer";

import stylesCSS from "./styles.module.css";

import Editor from '@monaco-editor/react';

class ExamLive extends Component {
  constructor(props) {
    super(props);

    this.state = {
      codeOutput: "",
      cameraStream: null,
      snapshots: [], // to store captured snapshots
      snapshotInterval: null, // to control the interval
      tabSwitchCount: 0,
      // In login
      examinerId: this.props.match.params.examinerId,
      examId: this.props.match.params.examId,

      // in questions page
      loadingQuestions: true,
      startDateTime: "",
      endDateTime: "",
      questionBank: {},
      candidateId: "",
      candidatePassword: "",
      responses: [],

      currentQuestionIndex: 0,
      answeredIndexes: [],
      markedIndexes: [],
      timeRemaining: "",

      // result
      resultScreen: false,
      result: {
        candidateName: "Abhishek Kumar Prasad",
        Marks: 12,
        examName: "MST 3",
        examinerName: "Teacher",
        examinerEmail: "teacher@cuchd.in",
      },
    };

    this.fetchQuestionBank = this.fetchQuestionBank.bind(this);
    this.loginRequestHandler = this.loginRequestHandler.bind(this);
    this.questionChangeHandler = this.questionChangeHandler.bind(this);
    this.generatelisArr = this.generatelisArr.bind(this);
    this.nextButtonHandler = this.nextButtonHandler.bind(this);
    this.markHandler = this.markHandler.bind(this);
    this.isCorrectOption = this.isCorrectOption.bind(this);
    this.setColor = this.setColor.bind(this);

    this.startTimer = this.startTimer.bind(this);

    this.submitResponses = this.submitResponses.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.executeCode = this.executeCode.bind(this);
    localStorage.setItem("tabSwitchCount", 0);
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.setState({ cameraStream: stream });

      // Access the video element in your HTML and set the stream as the source
      const videoElement = document.getElementById("cameraVideo");
      videoElement.srcObject = stream;
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  }

  takeSnapshot() {
    const videoElement = document.getElementById("cameraVideo");
    const canvasElement = document.createElement("canvas");
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    const context = canvasElement.getContext("2d");
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    const snapshot = canvasElement.toDataURL("image/png");

    this.setState((prevState) => ({
      snapshots: [...prevState.snapshots, snapshot],
    }));
    // log the snapshots array to the console
    console.log(this.state.snapshots, 'snapshots');
  }

  startSnapshotInterval() {
    // Set up the interval to take snapshots every 5 minutes (300,000 milliseconds)
    const interval = setInterval(() => {
      this.takeSnapshot();
    }, 300000);

    this.setState({ snapshotInterval: interval });
  }

  stopSnapshotInterval() {
    const { snapshotInterval } = this.state;
    if (snapshotInterval) {
      clearInterval(snapshotInterval);
      this.setState({ snapshotInterval: null });
    }
  }

  componentDidMount() {
    // Initialize tab switch count from local storage.
    const tabSwitchCount =
      parseInt(localStorage.getItem("tabSwitchCount"), 10) || 0;
    this.setState({ tabSwitchCount });

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  componentWillUnmount() {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
  }

  async handleVisibilityChange() {
    if (document.hidden) {
      if (this.state.tabSwitchCount <= 3)
        alert(
          "Warning: You have switched tabs. When you switch tab more than 3 times, your exam will be submitted automatically!"
        );
      else
        alert(
          "Warning: You have switched tabs. Your exam will be submitted automatically!"
        );
      const tabSwitchCount = this.state.tabSwitchCount + 1;
      this.setState({ tabSwitchCount });
      localStorage.setItem("tabSwitchCount", tabSwitchCount);

      if (tabSwitchCount >= 3) {
        // It's the second tab switch, submit the exam.
        // await this.submitResponsesWithoutConfirm();
      }
    }
  }

  // fetching questions for the exam
  async fetchQuestionBank() {
    // console.log(`${this.state.candidateId} ${this.state.candidatePassword}`);
    const response = await fetch(
      process.env.REACT_APP_API_URI + "/examlive/getexam",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examinerId: this.state.examinerId,
          examId: this.state.examId,
          candidateId: this.state.candidateId,
          candidatePassword: this.state.candidatePassword,
        }),
      }
    );

    const data = await response.json();

    if (data.message) {
      alert(data.message);
      window.history.back();
    } else {
      // console.log(moment(data.startDateTime).format());
      // console.log(moment(data.endDateTime).format());
      // console.log(JSON.stringify(data.questionBank));

      this.setState((state) => {
        const randomQuestions = data.questionBank.questions.sort(() => Math.random() - 0.5);
        return {
          startDateTime: moment(data.startDateTime).format(),
          endDateTime: moment(data.endDateTime).format(),
          // Set questions randomly
          questionBank: {
            ...data.questionBank,
            questions: randomQuestions,
          },
          loadingQuestions: false,
        };
      });
    }
  }

  startTimer() {
    var eventTime, currentTime, duration, interval, intervalId;

    eventTime = moment(this.state.endDateTime);

    interval = 1000; // 1 second

    currentTime = moment();

    duration = moment.duration(eventTime.diff(currentTime));

    intervalId = setInterval(
      function () {
        // get updated duration
        duration = moment.duration(duration - interval, "milliseconds");

        // console.log(duration);

        // if duration is >= 0
        if (duration.asSeconds() <= 0) {
          clearInterval(intervalId);
          // hide the countdown element
          this.setState((state) => {
            return {
              timeRemaining: `0:0:0`,
            };
          });
          this.submitResponsesWithoutConfirm();
        } else {
          // otherwise, show the updated countdown
          this.setState((state) => {
            return {
              timeRemaining: `${duration.hours()}:${duration.minutes()}:${duration.seconds()}`,
            };
          });
        }
      }.bind(this),
      interval
    );
  }

  async loginRequestHandler() {
    const candidateId = String(document.getElementById("candidateId").value);
    const candidatePassword = String(
      document.getElementById("candidatePassword").value
    );

    // console.log(`${candidateId} ${candidatePassword}`);

    await this.setState((state) => {
      return {
        candidateId: candidateId,
        candidatePassword: candidatePassword,
      };
    });

    if (candidateId !== "" && candidatePassword !== "") {
      await this.fetchQuestionBank();
    }

    // Start the camera immediately
    if (this.state.candidateId !== "" && this.state.candidatePassword !== "") {
        await this.fetchQuestionBank();
        this.startCamera();
        this.startSnapshotInterval(); // Start taking snapshots every 5 minutes
      }

    this.startTimer();
  }

  // takes index of question
  questionChangeHandler(index) {
    this.setState({
      currentQuestionIndex: index,
    });
  }

  // Records responses to the state
  async recordResponse(questionId, optionId) {
    // console.log(`${questionId} ${optionId}`);
    const foundResponse = this.state.responses.find(
      (response) => response.questionId === questionId
    );

    if (foundResponse !== undefined) {
      for (let i = 0; i < this.state.responses.length; i++) {
        if (this.state.responses[i].questionId === questionId) {
          if (this.state.responses[i].optionId === optionId) {
            //click on same option so we remove

            await this.setState((state) => {
              // console.log("click on same option so we remove");
              var newState = JSON.parse(JSON.stringify(state));
              newState.responses.splice(i, 1);

              const answeredArrIndx = newState.answeredIndexes.indexOf(
                this.state.currentQuestionIndex
              );

              if (answeredArrIndx > -1) {
                newState.answeredIndexes.splice(answeredArrIndx, 1);
              }

              return newState;
            });
          } else {
            //click on a new option of the same question so we update the optionId

            await this.setState((state) => {
              // console.log("click on a new option of the same question so we update the optionId");
              var newState = JSON.parse(JSON.stringify(state));

              newState.responses.splice(i, 1);

              newState.responses.push({
                questionType: "mcq",
                questionId: questionId,
                optionId: optionId,
              });

              return newState;
            });
          }
          break; //might save an issue
        }
      }
    } else {
      // a new quesiton response
      await this.setState((state) => {
        var newState = JSON.parse(JSON.stringify(state));

        newState.responses.push({
          questionType: "mcq",
          questionId: questionId,
          optionId: optionId,
        });

        newState.answeredIndexes.push(this.state.currentQuestionIndex);

        return newState;
      });
    }
    // console.log(this.state.responses);
    // console.log(this.state.answeredIndexes);
  }

  async recordCodeResponse(questionId, code) {
    // console.log(`${questionId} ${code}`);
    const foundResponse = this.state.responses.find(
      (response) => response.questionId === questionId
    );
    if (foundResponse !== undefined) {
      for (let i = 0; i < this.state.responses.length; i++) {
        if (this.state.responses[i].questionId === questionId) {
            await this.setState((state) => {
              var newState = JSON.parse(JSON.stringify(state));

              newState.responses.splice(i, 1);

              newState.responses.push({
                questionType: "code",
                questionId: questionId,
                code: code,
              });

              return newState;
            });
        }
        break; //might save an issue
      }
    } else {
      // a new quesiton response
      await this.setState((state) => {
        var newState = JSON.parse(JSON.stringify(state));

        newState.responses.push({
          questionType: "code",
          questionId: questionId,
          code: code,
        });

        newState.answeredIndexes.push(this.state.currentQuestionIndex);

        return newState;
      });
    }
    console.log(this.state.responses, "responses code");
  }

  async nextButtonHandler() {
    if (
      this.state.currentQuestionIndex + 1 <
      this.state.questionBank.questions.length
    )
      await this.setState((state) => {
        return {
          currentQuestionIndex: state.currentQuestionIndex + 1,
        };
      });
  }

  async markHandler() {
    if (
      this.state.markedIndexes.indexOf(this.state.currentQuestionIndex) >= 0
    ) {
      //unmarking the question
      await this.setState((state) => {
        var newState = JSON.parse(JSON.stringify(state));

        const answeredArrIndx = newState.markedIndexes.indexOf(
          this.state.currentQuestionIndex
        );

        if (answeredArrIndx > -1) {
          newState.markedIndexes.splice(answeredArrIndx, 1);
        }

        return newState;
      });
    } else {
      await this.setState((state) => {
        var newState = JSON.parse(JSON.stringify(state));

        newState.markedIndexes.push(this.state.currentQuestionIndex);

        return newState;
      });
    }

    console.log(this.state.markedIndexes);
  }

  isCorrectOption(questionId, optionId) {
    const foundResponse = this.state.responses.find(
      (response) =>
        response.questionId === questionId && response.optionId === optionId
    );

    if (foundResponse) {
      return true;
    } else {
      return false;
    }
  }

  async submitResponses() {
    var confirm = window.confirm("Sure you want to submit the responses?");

    if (confirm) {
      const request = {
        examinerId: this.state.examinerId,
        examId: this.state.examId,
        candidateId: this.state.candidateId,
        candidatePassword: this.state.candidatePassword,
        responses: JSON.parse(JSON.stringify(this.state.responses)),
      };

      const response = await fetch(
        process.env.REACT_APP_API_URI + "/examlive/getresult",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        }
      );

      // console.log(request);

      const data = await response.json();

      if (data.message) {
        alert(data.message);
      } else {
        this.setState((state) => {
          return {
            resultScreen: true,
            result: data,
          };
        });
      }
      localStorage.clear();
    }
  }

  async submitResponsesWithoutConfirm() {
    var confirm = true;
    if (confirm) {
      const request = {
        examinerId: this.state.examinerId,
        examId: this.state.examId,
        candidateId: this.state.candidateId,
        candidatePassword: this.state.candidatePassword,
        responses: JSON.parse(JSON.stringify(this.state.responses)),
      };

      const response = await fetch(
        process.env.REACT_APP_API_URI + "/examlive/getresult",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        }
      );

      // console.log(request);

      const data = await response.json();

      if (data.message) {
        alert(data.message);
      } else {
        this.setState((state) => {
          return {
            resultScreen: true,
            result: data,
          };
        });
      }
      localStorage.clear();
    }
  }

  // Render Helpers below this

  setColor(index) {
    if (index === this.state.currentQuestionIndex) {
      return `${stylesCSS.yellow}`;
    } else {
      if (this.state.markedIndexes.indexOf(index) >= 0) {
        return `${stylesCSS.lightViolet}`;
      } else {
        if (this.state.answeredIndexes.indexOf(index) >= 0) {
          return `${stylesCSS.lightGreen}`;
        } else {
          return ``;
        }
      }
    }
  }

  // executeCode() {
  //   console.log(this.state.responses, "responses");
  
  //   try {
  //     const codeObj = this.state.responses.find(
  //       (response) => response.questionId === this.state.questionBank.questions[this.state.currentQuestionIndex]._id
  //     );
      
  //     if (!codeObj) {
  //       // Handle scenario where code object is not found
  //       console.error('Code object not found for the current question');
  //       return;
  //     }
  
  //     const code = codeObj.code;
  //     // eslint-disable-next-line no-eval
  //     const result = eval(code);
  //     console.log(result, "result code")
  //     this.setState({ codeOutput: result });
  //     console.log(this.state.codeOutput, "codeOutput")
  //   } catch (error) {
  //     console.error('Error during code execution/transpilation:', error);
  //     // Handle or log the error appropriately
  //   }
  // }

  executeCode() {
    let output = '';
  
    // Override console.log to capture its output
    const originalConsoleLog = console.log;
    console.log = (message) => {
      output += message + '\n';
    };
  
    try {
      const codeObj = this.state.responses.find(
        (response) => response.questionId === this.state.questionBank.questions[this.state.currentQuestionIndex]._id
      );
      
      if (!codeObj) {
        // Handle scenario where code object is not found
        console.error('Code object not found for the current question');
        return;
      }
  
      const code = codeObj.code;
      // eslint-disable-next-line no-eval
      eval(code);
    } catch (error) {
      // Handle any errors that occur during execution
      console.error('Error executing code:', error);
      output += 'Error: ' + error + '\n';
    } finally {
      // Restore the original console.log
      console.log = originalConsoleLog;
    }
    this.setState({ codeOutput: output });
  }
  
  

  generatelisArr() {
    var listArr = [];

    if (this.state.questionBank.questions) {
      for (
        let index = 0;
        index < this.state.questionBank.questions.length;
        index++
      ) {
        listArr.push(
          <div
            key={index}
            className={`${stylesCSS.questionIndex} ${this.setColor(index)}`}
            onClick={() => {
              this.questionChangeHandler(index);
            }}
          >
            <p>{index + 1}</p>
          </div>
        );
      }
    }

    return listArr;
  }

  render() {
    // const candidateLogin = ;

    return (
      <div>
        {this.state.resultScreen ? (
          <div className={stylesCSS.resultPage}>
            <div className={stylesCSS.reportContainer}>
              <img src={BiggerLogo} alt="" />
              <p className={stylesCSS.reportDate}>
                {moment().format("MMMM Do YYYY")}
              </p>
              <div className={stylesCSS.candidateInfo}>
                <div className={stylesCSS.displayAsRow}>
                  <h2>{this.state.result.candidateName}</h2>
                  <p>
                    {" "}
                    has <br />
                  </p>
                </div>
                <div className={stylesCSS.displayAsRow}>
                  <p>scored </p>
                  <h2>
                    {this.state.result.Marks}/
                    {this.state.questionBank.questions
                      ? this.state.questionBank.questions.filter((que) => {
                          return que.questionType === "mcq";
                        }).length
                      : ""}
                  </h2>{" "}
                  <p> in </p> <h2>{this.state.result.examName}</h2>
                </div>
              </div>
              <div className={stylesCSS.infograph}>
                <center>
                  <table>
                    <tbody>
                      <tr>
                        <td>
                          <p>
                            <b>Total</b>
                          </p>
                        </td>
                        <td>
                          <div className={stylesCSS.infoBarContainer}>
                            <div
                              className={stylesCSS.infoBar}
                              style={{
                                width:
                                  this.state.questionBank.questions.filter(
                                    (que) => {
                                      return que.questionType === "mcq";
                                    }
                                  ).length * 5 +
                                  "px",
                              }}
                            ></div>
                            <p>
                              <b>
                                {this.state.questionBank.questions.filter((que) => {
                                  return que.questionType === "mcq";
                                }).length}
                              </b>
                            </p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p>
                            <b>Attempts</b>
                          </p>
                        </td>
                        <td>
                          <div className={stylesCSS.infoBarContainer}>
                            <div
                              className={stylesCSS.infoBar}
                              style={{
                                width: this.state.responses.filter((res) => {
                                  return res.questionType === "mcq";
                                }).length * 5 + "px",
                              }}
                            ></div>
                            <p>
                              <b>
                                {this.state.responses.filter((res) => {
                                  return res.questionType === "mcq";
                                }).length}
                              </b>
                            </p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p>
                            <b>Correct</b>
                          </p>
                        </td>
                        <td>
                          <div className={stylesCSS.infoBarContainer}>
                            <div
                              className={stylesCSS.infoBar}
                              style={{
                                width: this.state.result.Marks * 5 + "px",
                              }}
                            ></div>
                            <p>
                              <b>{this.state.result.Marks}</b>
                            </p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p>
                            <b>Wrong</b>
                          </p>
                        </td>
                        <td>
                          <div className={stylesCSS.infoBarContainer}>
                            <div
                              className={stylesCSS.infoBar}
                              style={{
                                width:
                                  (this.state.responses.filter((res) => {
                                    return res.questionType === "mcq";
                                  }).length -
                                    this.state.result.Marks) *
                                    5 +
                                  "px",
                              }}
                            ></div>
                            <p>
                              <b>
                                {this.state.responses.filter((res) => {
                                  return res.questionType === "mcq";
                                }).length -
                                  this.state.result.Marks}
                              </b>
                            </p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </center>
              </div>
              <div className={stylesCSS.examinerInfo}>
                <div className={stylesCSS.displayAsRow}>
                  <p>Taken By, </p>
                </div>
                <div className={stylesCSS.displayAsRow}>
                  <h2>{this.state.result.examinerName}</h2>
                </div>
                <div className={stylesCSS.displayAsRow}>
                  <p>{this.state.result.examinerEmail}</p>
                </div>
              </div>
            </div>
            <footer>
              <Footer />
            </footer>
          </div>
        ) : this.state.candidateId === "" &&
          this.state.candidatePassword === "" &&
          this.state.loadingQuestions ? (
          // Candidate Login
          <div className={stylesCSS.cardContainer}>
            <div className={stylesCSS.cardForm}>
              <img src={BiggerLogo} alt="logo" />
              <h3>Candidate Login</h3>
              <input
                className={stylesCSS.input}
                type="text"
                name=""
                id="candidateId"
                placeholder="Id"
                required
              />
              <input
                className={stylesCSS.input}
                type="password"
                name=""
                id="candidatePassword"
                placeholder="Password"
                required
              />
              <button
                className={stylesCSS.button}
                onClick={this.loginRequestHandler}
              >
                Start Exam
              </button>
            </div>
          </div>
        ) : (
          <div className={stylesCSS.examPageContainer}>
            <div className={stylesCSS.topBar}>
              <div className={stylesCSS.logoContainer}>
                <img src={MediumLogo} alt="logo" />
              </div>
              <div className={stylesCSS.questionsAttemptDetails}>
                <div className={stylesCSS.infoStack}>
                  <div className={stylesCSS.infoItem}>
                    <h1>
                      {this.state.questionBank.questions
                        ? this.state.questionBank.questions.length
                        : ""}
                    </h1>
                  </div>
                  <div className={stylesCSS.infoName}>
                    <p>Total Questions</p>
                  </div>
                </div>
                <div className={stylesCSS.infoStack}>
                  <div className={stylesCSS.infoItem}>
                    <h1>{this.state.answeredIndexes.length}</h1>
                  </div>
                  <div
                    className={`${stylesCSS.infoName} ${stylesCSS.darkgreen}`}
                  >
                    <p>Answered</p>
                  </div>
                </div>
                <div className={stylesCSS.infoStack}>
                  <div className={stylesCSS.infoItem}>
                    <h1>{this.state.markedIndexes.length}</h1>
                  </div>
                  <div
                    className={`${stylesCSS.infoName} ${stylesCSS.darkviolet}`}
                  >
                    <p>Marked</p>
                  </div>
                </div>
                <div className={stylesCSS.infoStack}>
                  <div className={stylesCSS.infoItem}>
                    <h1>
                      {this.state.questionBank.questions
                        ? this.state.questionBank.questions.length -
                          this.state.answeredIndexes.length
                        : ""}
                    </h1>
                  </div>
                  <div className={`${stylesCSS.infoName} ${stylesCSS.darkred}`}>
                    <p>Unanswered</p>
                  </div>
                </div>
              </div>
              <div className={stylesCSS.timeRemaining}>
                <div className={stylesCSS.infoStack}>
                  <div className={stylesCSS.infoItem}>
                    <h1>{this.state.timeRemaining}</h1>
                  </div>
                  <div className={stylesCSS.infoName}>
                    <p>Time Remaining</p>
                  </div>
                </div>
              </div>
              <div className={stylesCSS.submitButton}>
                <button
                  className={`${stylesCSS.button} ${stylesCSS.buttonSubmit}`}
                  onClick={this.submitResponses}
                >
                  Submit
                </button>
              </div>
            </div>
            <div className={stylesCSS.mainContainer}>
              <div className={stylesCSS.questionIndexList}>
                {this.generatelisArr().map((e) => e)}
                <center>
                  <p>
                    <b>End</b>
                  </p>
                </center>
              </div>
              <div className={stylesCSS.questionContainer}>
                {this.state.questionBank.questions ? (
                  // JSON.stringify(this.state.questionBank.questions[this.state.currentQuestionIndex])
                  <div className={stylesCSS.quesitonResponseCardContainer}>
                    <div className={stylesCSS.quesitonResponseCard}>
                      <h2 className={stylesCSS.colorGrey}>{`Question ${
                        this.state.currentQuestionIndex + 1
                      }`}</h2>
                      <div className={stylesCSS.quesitonResponseCard_question}>
                        <h2>
                          {
                            this.state.questionBank.questions[
                              this.state.currentQuestionIndex
                            ].value
                          }
                          {this.state.questionBank.questions[
                            this.state.currentQuestionIndex
                          ].snippetUrl && (
                            <div style={{ paddingTop: "10px" }}>
                              <img
                                src={
                                  this.state.questionBank.questions[
                                    this.state.currentQuestionIndex
                                  ].snippetUrl
                                }
                                alt="snippet"
                              />
                            </div>
                          )}
                        </h2>
                      </div>
                      <div>
                        {this.state.questionBank.questions[
                          this.state.currentQuestionIndex
                        ].questionType === "mcq" ? (
                          <div
                            className={stylesCSS.quesitonResponseCard_options}
                          >
                            {this.state.questionBank.questions[
                              this.state.currentQuestionIndex
                            ].options.map((option, i) => {
                              return (
                                <div
                                  key={i}
                                  className={
                                    stylesCSS.quesitonResponseCard_option
                                  }
                                >
                                  <i
                                    className={`fas fa-check-square fa-2x ${
                                      stylesCSS.checkMark
                                    } ${
                                      this.isCorrectOption(
                                        this.state.questionBank.questions[
                                          this.state.currentQuestionIndex
                                        ]._id,
                                        option._id
                                      )
                                        ? `${stylesCSS.checkMarkChecked}`
                                        : ""
                                    }`}
                                    onClick={() => {
                                      this.recordResponse(
                                        this.state.questionBank.questions[
                                          this.state.currentQuestionIndex
                                        ]._id,
                                        option._id
                                      );
                                    }}
                                  ></i>
                                  <p>{option.value}</p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div>
                          <div className={stylesCSS.quesitonResponseCard_option}>
                            <Editor
                              height="50vh"
                              theme="vs-dark"
                              defaultLanguage="javascript"
                              defaultValue=""
                              onChange={(value, event) => {
                                this.recordCodeResponse(
                                  this.state.questionBank.questions[
                                    this.state.currentQuestionIndex
                                  ]._id,
                                  value
                                );
                              }}
                            />
                          </div>
                          <button
                            onClick={this.executeCode}
                            style={{
                              margin: '10px',
                              padding: '10px',
                              fontSize: '16px',
                              fontWeight: 'bold', // Adding font weight
                            }}
                          >
                            RUN
                          </button>
                          <div>{this.state.codeOutput}</div>
                          </div>
                        )}
                      </div>
                      <div className={stylesCSS.quesitonResponseCard_buttons}>
                        <button
                          className={`${stylesCSS.confirmButton}`}
                          onClick={this.nextButtonHandler}
                        >
                          Next
                        </button>
                        <button
                          className={`${stylesCSS.confirmButton}`}
                          onClick={() => {
                            this.markHandler(this.state.currentQuestionIndex);
                          }}
                        >
                          {this.state.markedIndexes.indexOf(
                            this.state.currentQuestionIndex
                          ) >= 0
                            ? "UnMark"
                            : "Mark"}
                        </button>
                      </div>
                    </div>
                    <video
                      id="cameraVideo"
                      autoPlay
                      playsInline
                      style={{ display: "none" }}
                    ></video>
                  </div>
                ) : (
                  "Loading..."
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default ExamLive;