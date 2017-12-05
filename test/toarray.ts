import EventToArray from "../converters/toarray/convert";

export default function(event: IEvent): IEventArray {
  let eventArray = null;
  if (event.origin === TestConstants.MockOrigin) {
    eventArray = mockEventToArray(event);
  } else {
    eventArray = EventToArray(event);
  }
  return eventArray;
}

function mockEventToArray(event: IEvent) {
  let data: IEventArray = [
    event.id,
    event.origin,
    event.type,
    event.time,
    mockDataToArray(event.data)
  ];
  return data;
}

function mockDataToArray(data: object): any[] {
  return [data];
}
