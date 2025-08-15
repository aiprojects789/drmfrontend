import React from 'react';
import { Button, Form, Input } from 'antd';

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

const validateMessages = {
  required: '${label} is required!',
  types: {
    email: '${label} is not a valid email!',
  },
};

const onFinish = (values) => {
  console.log(values);
};

const Contact = () => (
  <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
    <div className="w-full max-w-xl bg-white rounded-xl pr-18 py-17">
      <h2 className="text-3xl font-semibold text-center  text-gray-800 mb-5 ms-15">Contact Us</h2>
      <p className="text-md  text-center  text-gray-400 mb-10 ms-15">We’re ready to answer any questions you may have about ARTDUNIYA . Please fill out some more information below.</p>
      <Form
        {...layout}
        name="contact-form"
        onFinish={onFinish}
        validateMessages={validateMessages}
        className="flex flex-col gap-4 "
      >
        <Form.Item
          name={['user', 'name']}
          label={<span className=" text-gray-700 text-lg">Name</span>}
          rules={[{ required: true }]}
        >
          <Input className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 !py-1 !text-lg" />
        </Form.Item>

        <Form.Item
          name={['user', 'email']}
          label={<span className="text-gray-700 !py-1 !text-lg">Email</span>}
          rules={[{ type: 'email', required: true }]}
        >
          <Input className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 !py-1 !text-lg" />
        </Form.Item>

        <Form.Item
          name={['user', 'description']}
          label={<span className="text-gray-700 !py-1 !text-lg">Description</span>}
        >
          <Input.TextArea
            rows={4}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring !py-1 !text-lg focus:ring-blue-200"
          />
        </Form.Item>

        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            className="bg-purple-600 hover:bg-purple-700 transition text-white mt-5 ms-13 font-medium !text-xl !px-10 !py-5 rounded-md"
          >
            Submit
          </Button>
        </Form.Item>
      </Form>
    </div>
  </div>
);

export default Contact;
